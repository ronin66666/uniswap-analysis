import { deployments, getNamedAccounts } from "hardhat";

export default async function uniswapV2Factory() {
    const { deployer } = await getNamedAccounts();

    const result = await deployments.deploy("UniswapV2Factory", {
        from: deployer,
        log: true,
        args: [deployer] //初始化deployer为交易费管理员
    })

    console.log("uniswapV2Factory address = ", result.address);
    
}

uniswapV2Factory.tags = ["uniswapV2Factory"];