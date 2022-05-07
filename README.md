# `Uniswap-V2`

## 部署

### 创建api key

infura注册： 
https://infura.io/register

然后登录创建账户，获取project id 

![infuraKey](./img/infuraKey.png)

其他`alchemy`创建key

https://docs.alchemy.com/alchemy/introduction/getting-started

编译时如果出现该错误
```bash
TypeError: Explicit type conversion not allowed from "int_const -1" to "uint128".
  --> @uniswap/lib/contracts/libraries/BitMath.sol:48:17:
   |
48 |         if (x & uint128(-1) > 0) {
   |                 ^^^^^^^^^^^

```
解决方法，删除`hardhat.config`文件中编译版本过高的配置
```bash
{
        version: "0.8.4",
        settings: {
          "optimizer": {
            "enabled": true,
            "runs": 200
          }
        }
      },
```

修改`v2-periphery/contracts/libraries/UniswapV2Library`里`pariFor()`方法里计算 交易对`(UniswapV2Pair)` 合约地址的`init_code`（也就是最后一个参数32字节的hash值）

### 获取init_code

在`UniswapV2Factory.sol`中新增如下代码，用于获取 `type(UniswapV2Pair).creationCode`的 `keccak256`值

```solidity
bytes32 public constant INIT_CODE_PAIR_HASH = keccak256(abi.encodePacked(type(UniswapV2Pair).creationCode));`
```
部署完`factory`后，调用`INIT_CODE_PAIR_HASH()` 方法获取`init_code`值，然后更改`v2-periphery/contracts/libraries/UniswapV2Library.sol`中计算`pari`中`init_code`的`hash`

```solidity
pair = address(
            uint256(
                keccak256(
                    abi.encodePacked(
                        hex"ff",
                        factory,
                        keccak256(abi.encodePacked(token0, token1)),
                        hex"04c5bcf1c819159e5c45c104009afc9c2fac68328baaf1c390990c1ebf354497" //修改 init code hash
                    )
                )
            )
        );
```

然后部署`UniswapV2Router02`合约

## 添加流动性

`UniswapV2Router02.sol`

```solidity
function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,	//tokenA期望添加数量
        uint amountBDesired,	//tokenB期望添加数量
        uint amountAMin,		//tokenA最小添加数量
        uint amountBMin,		//tokenB最小添加数量
        address to,     //获得的LP接收地址
        uint deadline   //过期时间
    ) external virtual override ensure(deadline) returns (uint amountA, uint amountB, uint liquidity) {
        //计算添加数量
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);

        //获取tokenA和tokenB流动性地址（预先计算 创建交易对的地址）
        address pair = UniswapV2Library.pairFor(factory, tokenA, tokenB);

        // 用户向流动池发送数量为 amountA 的 tokenA，amountB 的 tokenB
        TransferHelper.safeTransferFrom(tokenA, msg.sender, pair, amountA);
        TransferHelper.safeTransferFrom(tokenB, msg.sender, pair, amountB);
        // 流动池向 to 地址发送数量为 liquidity 的 LP
        liquidity = IUniswapV2Pair(pair).mint(to);
    }
```

添加流动性入口`addLiquidity()`  

1. 调用`_addLiquidity()`计算出实际添加的代币数量`(amountA, amountB)`

   ```solidity
   function _addLiquidity(
           address tokenA,
           address tokenB,
           uint amountADesired,        
           uint amountBDesired,        
           uint amountAMin,          
           uint amountBMin            
       ) internal virtual returns (uint amountA, uint amountB) {
           // 如果不存在交易对则创建（使用create2方法创建部署交易对合约）
           if (IUniswapV2Factory(factory).getPair(tokenA, tokenB) == address(0)) {
               IUniswapV2Factory(factory).createPair(tokenA, tokenB);
           }
           //获取库存量, 内部对token地址从小到大的顺序进行排序
           (uint reserveA, uint reserveB) = UniswapV2Library.getReserves(factory, tokenA, tokenB);
           if (reserveA == 0 && reserveB == 0) {//如果库存为0则添加数量为期望数量
               (amountA, amountB) = (amountADesired, amountBDesired);
           } else {
               //根据A期望值计算实际能添加的B的数值，实际数量在范围内就满足条件，如果超出范围，则使用B的期望值来计算A的实际能添加的数量
               uint amountBOptimal = UniswapV2Library.quote(amountADesired, reserveA, reserveB);
               if (amountBOptimal <= amountBDesired) {//如果B实际能添加的数量比期望值小
                   require(amountBOptimal >= amountBMin, 'UniswapV2Router: INSUFFICIENT_B_AMOUNT');
                   (amountA, amountB) = (amountADesired, amountBOptimal);
               } else {
                   //B期望值计算 A实际能添加的数量
                   uint amountAOptimal = UniswapV2Library.quote(amountBDesired, reserveB, reserveA);
                   assert(amountAOptimal <= amountADesired);
                   require(amountAOptimal >= amountAMin, 'UniswapV2Router: INSUFFICIENT_A_AMOUNT');
                   (amountA, amountB) = (amountAOptimal, amountBDesired);
               }
           }
       }
   ```

   - 获取交易对地址，没有则创建（`IUniswapV2Factory(factory).createPair(tokenA, tokenB);`）内部使用`create2`方式创建部署交易对合约
   - 获取`tokenA`和`tokenB`的库存量
     - 如果都为0，则按期望值添加， `getReserves()`方法内部会对`tokenA、tokenB`地址从小到大进行排序，然后对应`token0, token1` 和库存`reserve0, reserve1`
     - 如果不都为0，调用`UniswapV2Library.quote()`方法计算实际额能添加的数量
       - 先按`tokenA`的期望数量计算`tokenB`的实际能添加的数量`(amountBOptimal)`，如果`amountBOptimal`满足 ` amountBMin =< amountBOptimal<= amountBDesired ` 则添加数量为 ` (amountA, amountB) = (amountADesired, amountBOptimal); `
       - 如果能添加的`tokenB`的数量不满足条件则使用`tokenB`的`amountBDesired`来计算`tokenA`能添加的数量
       - **计算规则**：`amountB = amountA.mul(reserveB) / reserveA;`

2. 获取交易对地址，然后向地址中转入对应数量的代币数量

   ```solidity
       function pairFor( address factory, address tokenA, address tokenB
       ) internal pure returns (address pair) {
           //对tokenA和tokenB进行排序, 地址值从小到大,取得token0和token1
           (address token0, address token1) = sortTokens(tokenA, tokenB);
           //计算交易对合约地址，使用create2部署交易对（合约）地址
           //地址计算参数：
           //0xff
           //sender: 调用CREATE2的智能合约的地址, 这里是UniswapV2Factory的地址
           //slat: keccak256(abi.encodePacked(token0, token1)),
           //init_code:  要部署合约的字节码， 代码是用来创建合约的，合约创建完成后将返回运行时字节码（runtime bytecode），通常init_code代码包括合约的构造函数及其参数，以及合约代码本身。
           //获取方法：keccak256(abi.encodePacked(type(UniswapV2Pair).creationCode))， creationCode会不同
           pair = address(
               uint256(
                   keccak256(
                       abi.encodePacked(
                           hex"ff",
                           factory,
                           keccak256(abi.encodePacked(token0, token1)),
                           hex"04c5bcf1c819159e5c45c104009afc9c2fac68328baaf1c390990c1ebf354497" // init code hash
                       )
                   )
               )
           );
       }
   ```

3. `IUniswapV2Pair(pair).mint(to)`调用交易对合约铸造流动性凭证

   ```solidity
       function mint(address to) external lock returns (uint liquidity) {
           (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
           //查询该交易对，对应的代币数量
           uint balance0 = IERC20(token0).balanceOf(address(this));
           uint balance1 = IERC20(token1).balanceOf(address(this));
           //本次实际添加的数量
           uint amount0 = balance0.sub(_reserve0);
           uint amount1 = balance1.sub(_reserve1);
   		//团队协议费用开关（交易手续费为0.3%，其中1/6作为团队协议费用），
           bool feeOn = _mintFee(_reserve0, _reserve1);
           uint _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
           if (_totalSupply == 0) {//首次添加会永久锁定MINIMUM_LIQUIDITY（10**3（wei））个令牌
               liquidity = Math.sqrt(amount0.mul(amount1)).sub(MINIMUM_LIQUIDITY);
              _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
           } else {
           	//不是首次添加获得流动性令牌计算
               liquidity = Math.min(amount0.mul(_totalSupply) / _reserve0, amount1.mul(_totalSupply) / _reserve1);
           }
           require(liquidity > 0, 'UniswapV2: INSUFFICIENT_LIQUIDITY_MINTED');
           //为用户添加流动性令牌
           _mint(to, liquidity);
           //更新库存和价格
           _update(balance0, balance1, _reserve0, _reserve1);
           
           if (feeOn) kLast = uint(reserve0).mul(reserve1); // reserve0 and reserve1 are up-to-date
           emit Mint(msg.sender, amount0, amount1);
       }
   ```

   - 计算实际本次实际该添加的`toeknA`和`tokenB`的数量

   - 计算团队开发协议手续费

     ```solidity
        function _mintFee(uint112 _reserve0, uint112 _reserve1) private returns (bool feeOn) {
             address feeTo = IUniswapV2Factory(factory).feeTo(); 
             feeOn = feeTo != address(0); //如果设置了feeTo地址，则开启
             uint _kLast = kLast; //上次K值（reserve0).mul(reserve1)
             if (feeOn) {
                 if (_kLast != 0) {//上次库存为0时KLast为0
                     uint rootK = Math.sqrt(uint(_reserve0).mul(_reserve1));
                     uint rootKLast = Math.sqrt(_kLast);
                     if (rootK > rootKLast) {//如果只是添加流动性root = rootKLast不会收取手续费
                         uint numerator = totalSupply.mul(rootK.sub(rootKLast));
                         uint denominator = rootK.mul(5).add(rootKLast);
                         uint liquidity = numerator / denominator;
                         if (liquidity > 0) _mint(feeTo, liquidity);
                     }
                 }
             } else if (_kLast != 0) {
                 kLast = 0;
             }
         }
     ```

   - 计算流动性凭证数量，然后给用户，更新储存和价格

Uniswap相关公式和手续费计算可参考：https://blog.csdn.net/sanqima/article/details/109667469

[Uniswap白皮书](https://uniswap.org/whitepaper.pdf)手续费是从0.3%之中，抽取1/6给开发团队作为协议费，剩下的按比例返还给LP。注意，返还的不是实际参与交易的Token X和Token Y，而是LP Token(即Uniswap的平台币UNI)，而且Uniswap不是将UNI马上返还，而是当LP用户自己移除流动性或者直接提现UNI时，才返还UNI给LP用户

## 兑换

使用确定数量A兑换不确定数量B

```solidity
     //使用确定数量的A兑换不确定数量的B
    // 交易获得 tokenB 的数量不会小于 amountOutMin
    function swapExactTokensForTokens(
        uint amountIn,      //兑换支付的tokenA
        uint amountOutMin,  //获得tokenB的最小数量
        address[] calldata path,    //交易路径列表
        address to,     //接收地址
        uint deadline   //过期时间
    ) external virtual override ensure(deadline) returns (uint[] memory amounts) {
        //计算能兑换tokenB的数量(并不是实际能到手的金额)
        //amounts[1]: 为换出的token
        amounts = UniswapV2Library.getAmountsOut(factory, amountIn, path);

        require(amounts[amounts.length - 1] >= amountOutMin, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');
        // 用户转token为: path[0] 金额为amounts[0] 到池子中
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, UniswapV2Library.pairFor(factory, path[0], path[1]), amounts[0]
        );
			//兑换
        _swap(amounts, path, to);
    }
```

计算可退换出的B数量`amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);`

```solidity
function getAmountOut(
        uint256 amountIn,  //换入token数量
        uint256 reserveIn, //换入token库存
        uint256 reserveOut //换出token库存
    ) internal pure returns (uint256 amountOut) {
        require(amountIn > 0, "UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT");
        require(
            reserveIn > 0 && reserveOut > 0,
            "UniswapV2Library: INSUFFICIENT_LIQUIDITY"
        );
        //计算出可兑换出的token数量
        //amountOut = ((amountIn * 997) * reserveOut) / ((reserveIn * 1000) + (amountIn * 997))
        uint256 amountInWithFee = amountIn.mul(997); 
        uint256 numerator = amountInWithFee.mul(reserveOut);
        uint256 denominator = reserveIn.mul(1000).add(amountInWithFee);
        amountOut = numerator / denominator;
    }
```

可用于兑换数量 `amountA = amountAIn * (1 - 0.3%)` 0.3%为扣除的手续费

可换出数量`amountOut = (amountA * reserveB ) / (reserveA + amountA)`

兑换

```solidity
function _swap(uint[] memory amounts, address[] memory path, address _to) internal virtual {
        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            //小地址token0
            (address token0,) = UniswapV2Library.sortTokens(input, output);
            uint amountOut = amounts[i + 1];
            //兑出赋值
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
            //比如A换C,但是没有A换C的交易对，如果有A->B, B->C 的交易对，则根据路径 A -> B -> C, 会先将A换成B再换成C
            address to = i < path.length - 2 ? UniswapV2Library.pairFor(factory, output, path[i + 2]) : _to;
            //调用交易对swap方法
            IUniswapV2Pair(UniswapV2Library.pairFor(factory, input, output)).swap(
                amount0Out, amount1Out, to, new bytes(0)
            );
        }
    }
```

调用交易对的兑换方法

```solidity
//兑换
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external lock {
        require(amount0Out > 0 || amount1Out > 0, 'UniswapV2: INSUFFICIENT_OUTPUT_AMOUNT');
        //获取库存
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        require(amount0Out < _reserve0 && amount1Out < _reserve1, 'UniswapV2: INSUFFICIENT_LIQUIDITY');

        uint balance0;
        uint balance1;
        { // scope for _token{0,1}, avoids stack too deep errors 使用代码块来避免堆栈太深（变量过多）的错误
        address _token0 = token0;
        address _token1 = token1;
        require(to != _token0 && to != _token1, 'UniswapV2: INVALID_TO');

        //转出兑换的token到to接收地址
        if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out); // optimistically transfer tokens
        if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out); // optimistically transfer tokens

        if (data.length > 0) IUniswapV2Callee(to).uniswapV2Call(msg.sender, amount0Out, amount1Out, data);
        //从新获取余额
        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));
        }

        //计算换进的token数量
        uint amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        require(amount0In > 0 || amount1In > 0, 'UniswapV2: INSUFFICIENT_INPUT_AMOUNT');
        { // scope for reserve{0,1}Adjusted, avoids stack too deep errors

        //扣除换进手续费后池子剩余的余额，主要下面三行代码主要用于验证兑换数据是否正确
        uint balance0Adjusted = balance0.mul(1000).sub(amount0In.mul(3));
        //如果是token0换token1,则amount1In为0，balance1Adjusted = balance1 * 1000
        uint balance1Adjusted = balance1.mul(1000).sub(amount1In.mul(3));
        //保证兑换后的乘积K1 >= 兑换前的K，因为有手续费的存在，k值会越来越大
        require(balance0Adjusted.mul(balance1Adjusted) >= uint(_reserve0).mul(_reserve1).mul(1000**2), 'UniswapV2: K');
        }
        //更新余额，从新计算价格
        _update(balance0, balance1, _reserve0, _reserve1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }
```

更新余额和计算**时间累计价格**

更新资金池: 主要作用是对资金池的记录库存和实际余额进行匹配，保证库存和余额统一。
 函数 `_update `中对 `price0CumulativeLast 和 price1CumulativeLast `进行了与时间成反比的数值累加，可以通过这两个变量计算出相对平衡的市场价格，**时间加权平均价格 ** `TWAP = (price0Cumulative - price0CumulativeLast) / timeElapsed)`, 具体计算可看`v2-periphery/contracts/examples/ExampleOracleSimple.sol`

可参考链接：[UniswapV2 价格预言机](https://www.qklw.com/blockchain/20220426/240465.html)

```solidity
		/**
		uint balance0, // token0 的余额
        uint balance1, // token1 的余额
        uint112 _reserve0, // token0 的资金池库存数量
        uint112 _reserve1 // token1 的资金池库存数量
		*/
    function _update(uint balance0, uint balance1, uint112 _reserve0, uint112 _reserve1) private {
        // uint112(-1) = type(uint112).max
        // balance0 和 blanace1 不超过 uint112 的上限
        require(balance0 <= uint112(-1) && balance1 <= uint112(-1), 'UniswapV2: OVERFLOW');

        //uint32(block.timestamp % 2**32) 保证时间不超过uint32的最大值
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);

        //计算时间差：当前时间 - 上次更新时间
        uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            // * never overflows, and + overflow is desired

            //由于solidity没有浮点数所以 这里使用UQ112x112库来计算，防止当被除数小于除数时结果为0的情况
            //token1相对于token0 的timeElapsed累计价格计算：(_reserve1 / __reserve0) * 时间差， 
            price0CumulativeLast += uint(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) * timeElapsed;
            //token0相对于token1 的timeElapsed累计价格计算：(_reserve1 / __reserve0) * 时间差， 
            price1CumulativeLast += uint(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) * timeElapsed;
        }

        reserve0 = uint112(balance0); //保证库存和balance相等
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        emit Sync(reserve0, reserve1); //提交同步数据
    }
```

## 移除流动性

```solidity
//移除流动性，使用用户的流动性`liquidity`换回tokenA和tokenB
    //由于不是实时的，所以也需要传入最小值
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,     //销毁LP的数量
        uint amountAMin,    // 获得 tokenA 最小数量
        uint amountBMin,    // 获得 tokenB 最小数量
        address to,         // 获得的 tokenA、tokenB 接收地址
        uint deadline       // 超时时间
    ) public virtual override ensure(deadline) returns (uint amountA, uint amountB) {
        address pair = UniswapV2Library.pairFor(factory, tokenA, tokenB);
        //将用户的lp凭证 转到 交易池子中
        IUniswapV2Pair(pair).transferFrom(msg.sender, pair, liquidity); // send liquidity to pair

        //销毁并转账
        (uint amount0, uint amount1) = IUniswapV2Pair(pair).burn(to);
        // 计算出 tokenA, tokenB 中谁是 token0
        (address token0,) = UniswapV2Library.sortTokens(tokenA, tokenB);

        // 如果实际获得的 amountA < amountAMin 或者 amountB < amountBMin，那么交易失败
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);
        require(amountA >= amountAMin, 'UniswapV2Router: INSUFFICIENT_A_AMOUNT');
        require(amountB >= amountBMin, 'UniswapV2Router: INSUFFICIENT_B_AMOUNT');
    }
```

销毁LP

```solidity
	//销毁LP，返回tokenA 和 tokenB 的数量
    function burn(address to) external lock returns (uint amount0, uint amount1) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        address _token0 = token0;                                // gas savings
        address _token1 = token1;                                // gas savings
        uint balance0 = IERC20(_token0).balanceOf(address(this));
        uint balance1 = IERC20(_token1).balanceOf(address(this));
        uint liquidity = balanceOf[address(this)];

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
        //计算应返还的token0数量
        amount0 = liquidity.mul(balance0) / _totalSupply; // using balances ensures pro-rata distribution
        //计算应返还的token1数量
        amount1 = liquidity.mul(balance1) / _totalSupply; // using balances ensures pro-rata distribution
        require(amount0 > 0 && amount1 > 0, 'UniswapV2: INSUFFICIENT_LIQUIDITY_BURNED');
        //销毁LP
        _burn(address(this), liquidity);
        //转移token0,和token1
        _safeTransfer(_token0, to, amount0);
        _safeTransfer(_token1, to, amount1);
        
        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));
        //更新（时间和累计价）
        _update(balance0, balance1, _reserve0, _reserve1);
        //更新乘积模型K值
        if (feeOn) kLast = uint(reserve0).mul(reserve1); // reserve0 and reserve1 are up-to-date
        emit Burn(msg.sender, amount0, amount1, to);
    }
```

## 价格语言机

```solidity
pragma solidity =0.6.6;

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import '@uniswap/lib/contracts/libraries/FixedPoint.sol';

import '../libraries/UniswapV2OracleLibrary.sol';
import '../libraries/UniswapV2Library.sol';

// 每个周期重新计算整个周期的平均价格
contract ExampleOracleSimple {
    using FixedPoint for *;

    uint public constant PERIOD = 24 hours;

    IUniswapV2Pair immutable pair;
    address public immutable token0;
    address public immutable token1;

    uint    public price0CumulativeLast;   //上次token0累计价格
    uint    public price1CumulativeLast;   //上次token1累计价格 
    uint32  public blockTimestampLast; //上次更新时间
    FixedPoint.uq112x112 public price0Average;	//token0时间加权平均价
    FixedPoint.uq112x112 public price1Average;  //token1时间加权平均价

    constructor(address factory, address tokenA, address tokenB) public {
        IUniswapV2Pair _pair = IUniswapV2Pair(UniswapV2Library.pairFor(factory, tokenA, tokenB));
        pair = _pair;
        token0 = _pair.token0();
        token1 = _pair.token1();
        //获取交易对最新累计价
        price0CumulativeLast = _pair.price0CumulativeLast(); // fetch the current accumulated price value (1 / 0)
        price1CumulativeLast = _pair.price1CumulativeLast(); // fetch the current accumulated price value (0 / 1)
        uint112 reserve0;
        uint112 reserve1;
        (reserve0, reserve1, blockTimestampLast) = _pair.getReserves();
        require(reserve0 != 0 && reserve1 != 0, 'ExampleOracleSimple: NO_RESERVES'); // ensure that there's liquidity in the pair
    }

    //更新时间累计价和时间加权平均价
    function update() external {
        //当前时间累计价格
        (uint price0Cumulative, uint price1Cumulative, uint32 blockTimestamp) =
            UniswapV2OracleLibrary.currentCumulativePrices(address(pair));

        //时间差    
        uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired

        // ensure that at least one full period has passed since the last update
        require(timeElapsed >= PERIOD, 'ExampleOracleSimple: PERIOD_NOT_ELAPSED');

        // overflow is desired, casting never truncates
        // cumulative price is in (uq112x112 price * seconds) units so we simply wrap it after division by time elapsed
        //计算时间加权平均价格
        price0Average = FixedPoint.uq112x112(uint224((price0Cumulative - price0CumulativeLast) / timeElapsed));
        price1Average = FixedPoint.uq112x112(uint224((price1Cumulative - price1CumulativeLast) / timeElapsed));

        //更新时间累计价格
        price0CumulativeLast = price0Cumulative;
        price1CumulativeLast = price1Cumulative;
        //更新时间
        blockTimestampLast = blockTimestamp;
    }

    // note this will always return 0 before update has been called successfully for the first time.
    //计算能兑换的数量
    //token: 换进token地址，amountIn：换进数量
    // amountOut:换出代币数量
    function consult(address token, uint amountIn) external view returns (uint amountOut) {
        if (token == token0) {
            amountOut = price0Average.mul(amountIn).decode144();
        } else {
            require(token == token1, 'ExampleOracleSimple: INVALID_TOKEN');
            amountOut = price1Average.mul(amountIn).decode144();
        }
    }
}

```



## 无常损失

流动性提供者⽆常损失：⼀对代币存⼊Uniswap后，如果⼀种代币以另⼀种进⾏计价的价格上升，在价格上升后取出，总价格⽐原价值低⼀些，

低的部分就是损失。

https://zhuanlan.zhihu.com/p/268435169





参考链接
https://monokh.com/posts/uniswap-from-scratch































