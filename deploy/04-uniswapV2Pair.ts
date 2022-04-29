import { deployments, getNamedAccounts } from "hardhat";

export default async function uniswapV2Pair() {
    const { deployer } = await getNamedAccounts();
    const result = await deployments.deploy("UniswapV2Pair", {
        from: deployer,
        log: true
    })

    console.log("uniswapV2Pair address = ", result.address);
    
}

uniswapV2Pair.tags = ["uniswapV2Pair"];