import {createContext, memo, useCallback, useContext, useMemo} from 'react';
import {useChainId} from 'wagmi';
import {OPT_REWARDS_TOKENS, OPT_YVAGEUR_USDC_STAKING_CONTRACT, OPT_YVALETH_FRXETH_STAKING_CONTRACT, OPT_YVALETH_WETH_STAKING_CONTRACT, OPT_YVALUSD_FRAX_STAKING_CONTRACT, OPT_YVALUSD_USDC_STAKING_CONTRACT, OPT_YVDAI_STAKING_CONTRACT, OPT_YVDOLA_USDC_STAKING_CONTRACT, OPT_YVDOLAUSDC_STAKING_CONTRACT, OPT_YVERN_DOLA_STAKING_CONTRACT, OPT_YVERN_LUSD_STAKING_CONTRACT, OPT_YVETH_STAKING_CONTRACT, OPT_YVFRAX_DOLA_STAKING_CONTRACT, OPT_YVLDO_WSTETH_STAKING_CONTRACT, OPT_YVLUSD_WETH_STAKING_CONTRACT, OPT_YVMAI_ALUSD_STAKING_CONTRACT, OPT_YVMAI_DOLA_STAKING_CONTRACT, OPT_YVMAI_STAKING_CONTRACT, OPT_YVMAI_USDC_STAKING_CONTRACT, OPT_YVMAIUSDC_STAKING_CONTRACT, OPT_YVMIM_USDC_STAKING_CONTRACT, OPT_YVOP_USDC_STAKING_CONTRACT, OPT_YVOP_VELO_STAKING_CONTRACT, OPT_YVSNX_USDC_STAKING_CONTRACT, OPT_YVSUSCUSDC_STAKING_CONTRACT, OPT_YVUSDC_STAKING_CONTRACT, OPT_YVUSDT_STAKING_CONTRACT, OPT_YVVELO_USDC_STAKING_CONTRACT, OPT_YVWUSDR_USDC_STAKING_CONTRACT} from '@vaults/constants/optRewards';
import {useUI} from '@yearn-finance/web-lib/contexts/useUI';
import {useClientEffect} from '@yearn-finance/web-lib/hooks/useClientEffect';
import {toAddress} from '@yearn-finance/web-lib/utils/address';
import {BAL_TOKEN_ADDRESS, BALWETH_TOKEN_ADDRESS, CRV_TOKEN_ADDRESS, CVXCRV_TOKEN_ADDRESS, ETH_TOKEN_ADDRESS, LPYBAL_TOKEN_ADDRESS, LPYCRV_TOKEN_ADDRESS, LPYCRV_V2_TOKEN_ADDRESS, STYBAL_TOKEN_ADDRESS, YBAL_TOKEN_ADDRESS, YCRV_CURVE_POOL_V2_ADDRESS, YCRV_TOKEN_ADDRESS, YVBOOST_TOKEN_ADDRESS, YVECRV_TOKEN_ADDRESS} from '@yearn-finance/web-lib/utils/constants';
import {useYearn} from '@common/contexts/useYearn';
import {useBalances} from '@common/hooks/useBalances';

import type {ReactElement} from 'react';
import type {TDict} from '@yearn-finance/web-lib/types';
import type {TBalanceData} from '@yearn-finance/web-lib/types/hooks';
import type {TUseBalancesTokens} from '@common/hooks/useBalances';
import type {TYDaemonVault} from '@common/schemas/yDaemonVaultsSchemas';

export type	TWalletContext = {
	balances: TDict<TBalanceData>,
	cumulatedValueInVaults: number,
	balancesNonce: number,
	isLoading: boolean,
	refresh: (tokenList?: TUseBalancesTokens[]) => Promise<TDict<TBalanceData>>,
}

const defaultProps = {
	balances: {},
	cumulatedValueInVaults: 0,
	balancesNonce: 0,
	isLoading: true,
	refresh: async (): Promise<TDict<TBalanceData>> => ({})
};


/* 🔵 - Yearn Finance **********************************************************
** This context controls most of the user's wallet data we may need to
** interact with our app, aka mostly the balances and the token prices.
******************************************************************************/
const WalletContext = createContext<TWalletContext>(defaultProps);
export const WalletContextApp = memo(function WalletContextApp({children}: {children: ReactElement}): ReactElement {
	const chain = useChainId();
	const {vaults, vaultsMigrations, vaultsRetired, isLoadingVaultList, prices} = useYearn();
	const {onLoadStart, onLoadDone} = useUI();

	//List all tokens related to yearn vaults
	const availableTokens = useMemo((): TUseBalancesTokens[] => {
		if (isLoadingVaultList) {
			return [];
		}
		const safeChainID = chain === 1337 ? 1 : chain;
		const tokens: TUseBalancesTokens[] = [];
		const tokensExists: TDict<boolean> = {};
		const extraTokens: TUseBalancesTokens[] = [{token: ETH_TOKEN_ADDRESS}];
		if (safeChainID === 1) {
			extraTokens.push(...[
				{token: YCRV_TOKEN_ADDRESS},
				{token: LPYCRV_TOKEN_ADDRESS},
				{token: CRV_TOKEN_ADDRESS},
				{token: YVBOOST_TOKEN_ADDRESS},
				{token: YVECRV_TOKEN_ADDRESS},
				{token: CVXCRV_TOKEN_ADDRESS},
				{token: BAL_TOKEN_ADDRESS},
				{token: YBAL_TOKEN_ADDRESS},
				{token: BALWETH_TOKEN_ADDRESS},
				{token: STYBAL_TOKEN_ADDRESS},
				{token: LPYBAL_TOKEN_ADDRESS},
				{token: YCRV_CURVE_POOL_V2_ADDRESS},
				{token: LPYCRV_V2_TOKEN_ADDRESS}
			]);
		}
		if (safeChainID === 10) {
			extraTokens.push({token: OPT_YVETH_STAKING_CONTRACT, symbol: 'yvETH', decimals: 18});
			extraTokens.push({token: OPT_YVDAI_STAKING_CONTRACT, symbol: 'yvDAI', decimals: 18});
			extraTokens.push({token: OPT_YVUSDT_STAKING_CONTRACT, symbol: 'yvUSDT', decimals: 6});
			extraTokens.push({token: OPT_YVUSDC_STAKING_CONTRACT, symbol: 'yvUSDC', decimals: 6});
			extraTokens.push({token: OPT_YVSUSCUSDC_STAKING_CONTRACT, symbol: 'yvVelo-USDC-sUSD', decimals: 18});
			extraTokens.push({token: OPT_YVDOLAUSDC_STAKING_CONTRACT, symbol: 'yvVelo-DOLA-USDC', decimals: 18});
			extraTokens.push({token: OPT_YVMAIUSDC_STAKING_CONTRACT, symbol: 'yvVelo-MAI-USDC', decimals: 18});
			extraTokens.push({token: OPT_YVMAI_STAKING_CONTRACT, symbol: 'yvMAI', decimals: 18});
			extraTokens.push({token: OPT_YVMAI_USDC_STAKING_CONTRACT, symbol: 'yvMAI-USDC', decimals: 18});
			extraTokens.push({token: OPT_YVMAI_DOLA_STAKING_CONTRACT, symbol: 'yvMAI-DOLA', decimals: 18});
			extraTokens.push({token: OPT_YVLDO_WSTETH_STAKING_CONTRACT, symbol: 'yvLDO-WSTETH', decimals: 18});
			extraTokens.push({token: OPT_YVWUSDR_USDC_STAKING_CONTRACT, symbol: 'yvWUSDR-USDC', decimals: 18});
			extraTokens.push({token: OPT_YVVELO_USDC_STAKING_CONTRACT, symbol: 'yvVELO-USDC', decimals: 18});
			extraTokens.push({token: OPT_YVMAI_ALUSD_STAKING_CONTRACT, symbol: 'yvVelo-MAI-alUSD', decimals: 18});
			extraTokens.push({token: OPT_YVALUSD_FRAX_STAKING_CONTRACT, symbol: 'yvVelo-alUSD-FRAX', decimals: 18});
			extraTokens.push({token: OPT_YVALETH_FRXETH_STAKING_CONTRACT, symbol: 'yvVelo-alETH-frxETH', decimals: 18});
			extraTokens.push({token: OPT_YVALETH_WETH_STAKING_CONTRACT, symbol: 'yvVelo-alETH-WETH', decimals: 18});
			extraTokens.push({token: OPT_YVERN_DOLA_STAKING_CONTRACT, symbol: 'yvVelo-ERN-DOLA', decimals: 18});
			extraTokens.push({token: OPT_YVERN_LUSD_STAKING_CONTRACT, symbol: 'yvVelo-ERN-LUSD', decimals: 18});
			extraTokens.push({token: OPT_YVLUSD_WETH_STAKING_CONTRACT, symbol: 'yvVelo-LUSD-WETH', decimals: 18});
			extraTokens.push({token: OPT_YVAGEUR_USDC_STAKING_CONTRACT, symbol: 'yvVelo-agEUR-USDC', decimals: 18});
			extraTokens.push({token: OPT_YVMIM_USDC_STAKING_CONTRACT, symbol: 'yvVelo-MIM-USDC', decimals: 18});
			extraTokens.push({token: OPT_YVDOLA_USDC_STAKING_CONTRACT, symbol: 'yvVelo-DOLA-USDC', decimals: 18});
			extraTokens.push({token: OPT_YVOP_USDC_STAKING_CONTRACT, symbol: 'yvVelo-OP-USDC', decimals: 18});
			extraTokens.push({token: OPT_YVOP_VELO_STAKING_CONTRACT, symbol: 'yvVelo-OP-VELO', decimals: 18});
			extraTokens.push({token: OPT_YVSNX_USDC_STAKING_CONTRACT, symbol: 'yvVelo-SNX-USDC', decimals: 18});
			extraTokens.push({token: OPT_YVFRAX_DOLA_STAKING_CONTRACT, symbol: 'yvVelo-DOLA-FRAX', decimals: 18});
			extraTokens.push({token: OPT_YVALUSD_USDC_STAKING_CONTRACT, symbol: 'yvVelo-ALUSD-USDC', decimals: 18});
		}
		for (const token of extraTokens) {
			tokensExists[token.token] = true;
			tokens.push(token);
		}

		Object.values(vaults || {}).forEach((vault?: TYDaemonVault): void => {
			if (!vault) {
				return;
			}
			if (vault?.address && !tokensExists[toAddress(vault?.address)]) {
				tokens.push({token: vault.address});
			}
			if (vault?.token?.address && !tokensExists[toAddress(vault?.token?.address)]) {
				tokens.push({token: vault.token.address});
			}
		});
		return tokens;
	}, [isLoadingVaultList, chain, vaults]);

	//List all vaults with a possible migration
	const migratableTokens = useMemo((): TUseBalancesTokens[] => {
		const tokens: TUseBalancesTokens[] = [];
		Object.values(vaultsMigrations || {}).forEach((vault?: TYDaemonVault): void => {
			if (!vault) {
				return;
			}
			tokens.push({token: vault?.address});
		});
		return tokens;
	}, [vaultsMigrations]);

	const retiredTokens = useMemo((): TUseBalancesTokens[] => {
		const tokens: TUseBalancesTokens[] = [];
		Object.values(vaultsRetired || {}).forEach((vault?: TYDaemonVault): void => {
			if (!vault) {
				return;
			}
			tokens.push({token: vault?.address});
		});
		return tokens;
	}, [vaultsRetired]);

	// Fetch the balances
	const {data: balances, update, updateSome, nonce, isLoading} = useBalances({
		tokens: [...availableTokens, ...migratableTokens, ...retiredTokens],
		prices
	});


	//Compute the cumulatedValueInVaults
	const cumulatedValueInVaults = useMemo((): number => {
		nonce; //Suppress warning

		return (
			Object
				.entries(balances)
				.reduce((acc, [token, balance]): number => {
					if (vaults?.[toAddress(token)]) {
						acc += balance.normalizedValue || 0;
					} else if (vaultsMigrations?.[toAddress(token)]) {
						acc += balance.normalizedValue || 0;
					}
					if (chain === 10 && OPT_REWARDS_TOKENS.includes(toAddress(token))) {
						acc += balance.normalizedValue || 0;
					}
					return acc;
				}, 0)
		);
	}, [vaults, vaultsMigrations, balances, nonce, chain]);

	const onRefresh = useCallback(async (tokenToUpdate?: TUseBalancesTokens[]): Promise<TDict<TBalanceData>> => {
		if (tokenToUpdate) {
			const updatedBalances = await updateSome(tokenToUpdate);
			return updatedBalances;
		}
		const updatedBalances = await update();
		return updatedBalances;

	}, [update, updateSome]);

	useClientEffect((): void => {
		if (isLoading) {
			onLoadStart();
		} else {
			onLoadDone();
		}
	}, [isLoading]);

	/* 🔵 - Yearn Finance ******************************************************
	**	Setup and render the Context provider to use in the app.
	***************************************************************************/
	const contextValue = useMemo((): TWalletContext => ({
		balances: balances,
		balancesNonce: nonce,
		cumulatedValueInVaults,
		isLoading: isLoading || false,
		refresh: onRefresh
	}), [balances, cumulatedValueInVaults, isLoading, onRefresh, nonce]);

	return (
		<WalletContext.Provider value={contextValue}>
			{children}
		</WalletContext.Provider>
	);
});


export const useWallet = (): TWalletContext => useContext(WalletContext);
export default useWallet;
