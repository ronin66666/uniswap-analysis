pragma solidity =0.5.16;

import './interfaces/IUniswapV2Factory.sol';
import './UniswapV2Pair.sol';

contract UniswapV2Factory is IUniswapV2Factory {
    address public feeTo;
    address public feeToSetter;

    //token0 => token1 => pair
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    // 初始化手续费管理员地址
    constructor(address _feeToSetter) public {
        feeToSetter = _feeToSetter;
    }

    //返回当前资金池的数量
    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }

    // 创建新的资金池合约，需要传入 tokenA 和 tokenB，返回资金池地址 pair。
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, 'UniswapV2: IDENTICAL_ADDRESSES');
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'UniswapV2: ZERO_ADDRESS');
        //判断交易对是否存在
        require(getPair[token0][token1] == address(0), 'UniswapV2: PAIR_EXISTS'); // single check is sufficient

        // 获取 UniswapV2Pair 合约的字节码
        bytes memory bytecode = type(UniswapV2Pair).creationCode;
        // 使用参数 token0, token1 计算 salt
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));

        // 使用 create2 部署 Pair 合约
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        //调用初始化方法
        IUniswapV2Pair(pair).initialize(token0, token1);

        //记录token0 => token1 交易对为pair
        getPair[token0][token1] = pair;
        //反向填充
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        //储存交易对地址
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, 'UniswapV2: FORBIDDEN');
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, 'UniswapV2: FORBIDDEN');
        feeToSetter = _feeToSetter;
    }
}
