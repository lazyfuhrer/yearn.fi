import {useCallback, useMemo, useRef} from 'react';
import getVaultEstimateOut from '@vaults/utils/getVaultEstimateOut';
import {useSettings} from '@yearn-finance/web-lib/contexts/useSettings';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {useChainID} from '@yearn-finance/web-lib/hooks/useChainID';
import {allowanceKey, toAddress} from '@yearn-finance/web-lib/utils/address';
import {MAX_UINT_256} from '@yearn-finance/web-lib/utils/constants';
import {toNormalizedBN} from '@yearn-finance/web-lib/utils/format.bigNumber';
import {useYearn} from '@common/contexts/useYearn';
import {Solver} from '@common/schemas/yDaemonTokenListBalances';
import {allowanceOf, approveERC20, depositViaPartner, withdrawShares} from '@common/utils/actions';
import {assert} from '@common/utils/assert';
import {assertAddress} from '@common/utils/wagmiUtils';

import type {TDict} from '@yearn-finance/web-lib/types';
import type {TTxStatus} from '@yearn-finance/web-lib/utils/web3/transaction';
import type {TNormalizedBN} from '@common/types/types';
import type {TInitSolverArgs, TSolverContext} from '@vaults/types/solvers';

export function useSolverPartnerContract(): TSolverContext {
	const {networks} = useSettings();
	const {provider} = useWeb3();
	const {chainID, safeChainID} = useChainID();
	const {currentPartner} = useYearn();
	const latestQuote = useRef<TNormalizedBN>();
	const request = useRef<TInitSolverArgs>();
	const existingAllowances = useRef<TDict<TNormalizedBN>>({});

	/* 🔵 - Yearn Finance **************************************************************************
	** init will be called when the partner contract solver should be used to deposit.
	** It will set the request to the provided value, as it's required to get the quote, and will
	** call getQuote to get the current quote for the provided request.
	**********************************************************************************************/
	const init = useCallback(async (_request: TInitSolverArgs): Promise<TNormalizedBN> => {
		request.current = _request;
		const estimateOut = await getVaultEstimateOut({
			inputToken: toAddress(_request.inputToken.value),
			outputToken: toAddress(_request.outputToken.value),
			inputDecimals: _request.inputToken.decimals,
			outputDecimals: _request.outputToken.decimals,
			inputAmount: _request.inputAmount,
			isDepositing: _request.isDepositing,
			chainID: chainID
		});
		latestQuote.current = estimateOut;
		return latestQuote.current;
	}, [chainID]);

	/* 🔵 - Yearn Finance ******************************************************
	** Retrieve the allowance for the token to be used by the solver. This will
	** be used to determine if the user should approve the token or not.
	**************************************************************************/
	const onRetrieveAllowance = useCallback(async (shouldForceRefetch?: boolean): Promise<TNormalizedBN> => {
		if (!request?.current) {
			return toNormalizedBN(0);
		}

		const key = allowanceKey(
			safeChainID,
			toAddress(request.current.inputToken.value),
			toAddress(request.current.outputToken.value),
			toAddress(request.current.from)
		);
		if (existingAllowances.current[key] && !shouldForceRefetch) {
			return existingAllowances.current[key];
		}

		const allowance = await allowanceOf({
			connector: provider,
			tokenAddress: toAddress(request.current.inputToken.value),
			spenderAddress: toAddress(networks[safeChainID].partnerContractAddress)
		});
		existingAllowances.current[key] = toNormalizedBN(allowance, request.current.inputToken.decimals);
		return existingAllowances.current[key];
	}, [request, provider, networks, safeChainID]);

	/* 🔵 - Yearn Finance ******************************************************
	** Trigger an approve web3 action, simply trying to approve `amount` tokens
	** to be used by the Partner contract or the final vault, in charge of
	** depositing the tokens.
	** This approve can not be triggered if the wallet is not active
	** (not connected) or if the tx is still pending.
	**************************************************************************/
	const onApprove = useCallback(async (
		amount = MAX_UINT_256,
		txStatusSetter: React.Dispatch<React.SetStateAction<TTxStatus>>,
		onSuccess: () => Promise<void>
	): Promise<void> => {
		const partnerContract = networks[safeChainID]?.partnerContractAddress;

		assert(request.current, 'Request is not set');
		assert(request.current?.inputToken, 'Input token is not set');
		assertAddress(partnerContract, 'partnerContract');

		const result = await approveERC20({
			connector: provider,
			contractAddress: request.current.inputToken.value,
			spenderAddress: partnerContract,
			amount: amount,
			statusHandler: txStatusSetter
		});
		if (result.isSuccessful) {
			onSuccess();
		}
	}, [networks, provider, safeChainID]);

	/* 🔵 - Yearn Finance ******************************************************
	** Trigger a deposit web3 action, simply trying to deposit `amount` tokens
	** via the Partner Contract, to the selected vault.
	**************************************************************************/
	const onExecuteDeposit = useCallback(async (
		txStatusSetter: React.Dispatch<React.SetStateAction<TTxStatus>>,
		onSuccess: () => Promise<void>
	): Promise<void> => {
		const partnerContract = networks[safeChainID]?.partnerContractAddress;

		assert(request.current, 'Request is not set');
		assert(request.current.inputAmount, 'Input amount is not set');

		const result = await depositViaPartner({
			connector: provider,
			contractAddress: partnerContract,
			vaultAddress: request.current.outputToken.value,
			partnerAddress: currentPartner ? currentPartner : undefined,
			amount: request.current.inputAmount,
			statusHandler: txStatusSetter
		});
		if (result.isSuccessful) {
			onSuccess();
		}
	}, [currentPartner, networks, provider, safeChainID]);

	/* 🔵 - Yearn Finance ******************************************************
	** Trigger a withdraw web3 action using the vault contract to take back
	** some underlying token from this specific vault.
	**************************************************************************/
	const onExecuteWithdraw = useCallback(async (
		txStatusSetter: React.Dispatch<React.SetStateAction<TTxStatus>>,
		onSuccess: () => Promise<void>
	): Promise<void> => {
		assert(request.current, 'Request is not set');
		assert(request.current.inputToken, 'Input token is not set');
		assert(request.current.inputAmount, 'Input amount is not set');

		const result = await withdrawShares({
			connector: provider,
			contractAddress: request.current.inputToken.value,
			amount: request.current.inputAmount,
			statusHandler: txStatusSetter
		});
		if (result.isSuccessful) {
			onSuccess();
		}
	}, [provider]);

	return useMemo((): TSolverContext => ({
		type: Solver.enum.PartnerContract,
		quote: latestQuote?.current || toNormalizedBN(0),
		init,
		onRetrieveAllowance,
		onApprove,
		onExecuteDeposit,
		onExecuteWithdraw
	}), [latestQuote, init, onApprove, onExecuteDeposit, onExecuteWithdraw, onRetrieveAllowance]);
}
