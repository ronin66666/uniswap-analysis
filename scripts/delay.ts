import { ethers } from "ethers";



export async function advanceTime(provider: ethers.providers.JsonRpcProvider, time: string) {
    await provider.send('evm_increaseTime', [time]);
}

export async function advanceBlock(provider: ethers.providers.JsonRpcProvider) {
    await provider.send('evm_mine',[]);
}

export async function delay1Day(provider: ethers.providers.JsonRpcProvider) {
    let day = "86400";
    await advanceTime(provider, day);
    await advanceBlock(provider);
}
