import { deployments, ethers, getNamedAccounts } from "hardhat";

export default async function TokenERC20() {
    const { deployer } = await getNamedAccounts();

    const totalSupply = ethers.utils.parseEther("100000000");

    const result = await deployments.deploy("TokenERC20", {
        from: deployer,
        log: true,
        args: [totalSupply]
    })
    console.log("ERC20 address = ", result.address);
}

TokenERC20.tags = ["token"];