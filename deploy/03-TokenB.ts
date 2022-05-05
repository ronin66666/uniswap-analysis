import { deployments, ethers, getNamedAccounts } from "hardhat";

export default async function tokenB() {
    const { deployer } = await getNamedAccounts();
    const totalSupply = ethers.utils.parseEther("200000000");
    const result = await deployments.deploy("TokenBERC20", {
        from: deployer,
        log: true,
        args:[totalSupply]
    })
    console.log("tokenB address = ", result.address);
}

tokenB.tags = ["tokenB"];