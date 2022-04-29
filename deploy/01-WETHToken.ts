import { deployments, getNamedAccounts } from "hardhat";

export default async function wethToken() {
    const { deployer } = await getNamedAccounts();
    const result = await deployments.deploy("WETH9", {
        from: deployer,
        log: true
    })

    console.log("weth address = ", result.address);
}

wethToken.tags = ["weth"];