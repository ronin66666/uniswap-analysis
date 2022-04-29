import { deployments, getNamedAccounts } from "hardhat";

async function deployGreeter() {

    const {deployer} = await getNamedAccounts();
    console.log("deployer address =", deployer);
    
    const deploy = deployments.deploy;

    const deployment = await deploy("Greeter", {
        from: deployer,
        log: true,
        args: ["zhang san"]
    });

    console.log("greeter address = ", deployment.address);
    
}

export default deployGreeter;
deployGreeter.tags = ["greeter"];