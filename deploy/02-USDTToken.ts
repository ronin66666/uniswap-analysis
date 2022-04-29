import { deployments, getNamedAccounts } from "hardhat";

export default async function usdtToken() {
    const { deployer } = await getNamedAccounts();
    const result = await deployments.deploy("USDTToken", {
        from: deployer,
        log: true
    })
    console.log("usdt address = ", result.address);
}

usdtToken.tags = ["usdt"];