import { deployments, getNamedAccounts } from "hardhat";

export default async function uniswapV2Router02() {

    const { deployer } = await getNamedAccounts();

    const factoryAddress = (await deployments.get("UniswapV2Factory")).address;
    const wethAddress = (await deployments.get("WETH9")).address;

    const result = await deployments.deploy("UniswapV2Router02", {
        from: deployer,
        log: true,
        args: [factoryAddress, wethAddress] //初始化deployer为交易费管理员
    })

    console.log("UniswapV2Router02 address = ", result.address);
    
}

uniswapV2Router02.tags = ["uniswapV2Router02"];