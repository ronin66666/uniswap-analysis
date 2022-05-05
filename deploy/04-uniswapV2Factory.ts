import { deployments, getNamedAccounts } from "hardhat";

export default async function uniswapV2Factory() {
    const { deployer } = await getNamedAccounts();
    const feeToAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
    const result = await deployments.deploy("UniswapV2Factory", {
        from: deployer,
        log: true,
        args: [feeToAddress] //初始化deployer为交易费管理员
    })

    console.log("uniswapV2Factory address = ", result.address);
    
}

uniswapV2Factory.tags = ["uniswapV2Factory"];