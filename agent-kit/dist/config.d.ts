export interface AgentKitConfig {
    rpcUrl: string;
    chainId: number;
    explorerUrl: string;
    vaultAddress: string;
    agentPrivateKey: string;
}
export declare function loadAgentKitConfig(env?: NodeJS.ProcessEnv): AgentKitConfig;
//# sourceMappingURL=config.d.ts.map