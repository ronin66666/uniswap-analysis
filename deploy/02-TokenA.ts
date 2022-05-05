import { deployments, ethers, getNamedAccounts } from "hardhat";

export default async function tokenA() {
    const { deployer } = await getNamedAccounts();
    const totalSupply = ethers.utils.parseEther("200000000");
    const result = await deployments.deploy("TokenAERC20", {
        from: deployer,
        log: true,
        args:[totalSupply]
    })
    console.log("tokenA address = ", result.address);
}

tokenA.tags = ["tokenA"];