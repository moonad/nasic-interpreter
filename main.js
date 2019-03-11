/*
 * Example - Running code on an ethereum-vm
 *
 *
 * To run this example in the browser, bundle this file
 * with browserify using `browserify index.js -o bundle.js`
 * and then load this folder onto a HTTP WebServer (e.g.
 * using node-static or `python -mSimpleHTTPServer`).
 */

// opcodes
const STOP          =   "00";
const ADD           =   "01";
const MUL           =   "02";
const SUB           =   "03";
const DIV           =   "04";
const EQ            =   "14";
const AND           =   "16";
const OR            =   "17";
const XOR           =   "18";
const NOT           =   "19";
const CALLDATACOPY  =   "37";
const POP           =   "50";
const MLOAD         =   "51";
const MSTORE        =   "52";
const MSTORE8       =   "53";
const JUMP          =   "56";
const JUMPI         =   "57";
const JUMPDEST      =   "5b";
const PUSH1         =   "60";
const PUSH2         =   "61";
const PUSH4         =   "63";
const PUSH32        =   "7f";
const DUP1          =   "80";
const DUP2          =   "81";
const DUP3          =   "82";
const DUP4          =   "83";
const DUP5          =   "84";

// Important memory positions
const BUFFER_SIZE_POS = "1f";
const NODE_SIZE = "20"; // node size = 32 bytes (in hex)
const FIRST_NODE_POS = (parseInt(BUFFER_SIZE_POS, 16) + parseInt(NODE_SIZE, 16)).toString(16);

var Buffer = require("safe-buffer").Buffer; // use for Node.js <4.5.0
var VM = require("ethereumjs-vm");

// create a new VM instance
var vm = new VM();

////////////////////// FUNCTIONS //////////////////////

// NOT WORKING
// new_node(kind) -- Allocates a new node
// gas cost = 63 + 18*
var new_node = [
    // Stack contains kind -> x
    // get buffer last writable position
    PUSH1, BUFFER_SIZE_POS,
    MLOAD,
    PUSH1, "01",
    ADD,
    // Now last value in stack is the last used position in the buffer

    // Update buffer size
    DUP1, // Duplicate position on stack because we need to
          // use this value later

    PUSH1, "04",
    ADD,
    PUSH1, BUFFER_SIZE_POS,
    MSTORE,
    // Again, last value in stack is the last used position in the buffer

    // White new node ports and kind
    // -- Proceed to next position in the buffer
    PUSH1, "01",
    ADD,
    // -- Connect port to itself
    DUP1,
    DUP1,
    MSTORE,

    // -- Proceed to next position in the buffer
    PUSH1, "01",
    ADD,
    // -- Connect port to itself
    DUP1,
    DUP1,
    MSTORE,

    // -- Proceed to next position in the buffer
    PUSH1, "01",
    ADD,
    // -- Connect port to itself
    DUP1,
    DUP1,
    MSTORE,

    // -- Proceed to next position in the buffer
    PUSH1, "01",
    ADD,
    // -- Store 'kind' in memory (Assuming its value is the next in stack)
    MSTORE
].join("");

// node(node_id) -- Returns the memory position of a node
// gas cost = 14
var node = [
    // Stack contains: node_id -> x
    // NODE_POSITION = node_id * NODE_SIZE + FIRST_NODE_POS
    PUSH1, NODE_SIZE,
    MUL,
    PUSH1, FIRST_NODE_POS,
    ADD,
    // Stack contains: node_pos -> x
].join("");

// port(node, slot) -- Calculate the memory position of a port
// A port can be understood as a (node, slot) tuple. A port is calculated by
// abstracting how the network is stored in memory from a format:
// RMem: [NODE0, NODE1, NODE2, ...] where each node has 256 bits and
// VMem: [[SLOT0_0, SLOT1_0, SLOT2_0, KIND0], [SLOT0_1, SLOT1_1, SLOT2_1, KIND1], ...]
// where each slot has 64 bits.
// The 'port' can be understood as a position in this "Virtual Memory" (VMem), which
// is an abstraction of the "Real Memory" (RMem).
//
// ATTENTION: You should NEVER try to MSTORE anything directly in a 'port'. This is
// only an abstraction to make reasoning easier, not an address to be used!
//
// gas cost = 17
var port = [
    // Stack contains node_id -> slot -> x
    // port's position in abstract memory = BUFFER_SIZE_POS + (node_id * NODE_SIZE) + (slot+1 * 8)
    PUSH1, "00",
    MSTORE, // Store node_id in memory
    // stack contains slot -> x
    PUSH1, "01",
    ADD,
    PUSH1, "08",
    MUL,
    // stack contains ((slot + 1) * 8) -> x
    PUSH1, "00",
    MLOAD, // load node_id from memory into stack
    PUSH1, NODE_SIZE,
    MUL,
    // stack contains (node_id * NODE_SIZE) -> (slot * 8) -> x
    PUSH1, BUFFER_SIZE_POS,
    ADD,
    ADD,
    // stack contains port -> x
].join("");

// addr (port) -- Returns the node to which a port belongs
// gas cost = 20 + 6*
var addr = [
    // Stack contains port -> x
    PUSH1, BUFFER_SIZE_POS,
    SUB,
    PUSH1, NODE_SIZE,
    DIV,
    // Stack contains: addr -> x
].join("");

// slot(port) -- Returns the slot of a port
// gas cost = 6
var slot = [
    // Stack contains port -> x
    PUSH1, "08",
    DIV,
    PUSH1, "03",
    AND,
].join("");

// NOT WORKING
// enter(port) -- returns the value stored in port memory position
// gas cost = 3*
var enter = [
    // Stack contains port -> x
    MLOAD //TODO: This gets a whole 256 bits word from memory, not just the
          //      value in node port. Find a solution to this problem.
].join("");

// NOT WORKING
// kind(node) -- Returns the kind of the node
// 0 = era (i.e., a set or a garbage collector)
// 1 = con (i.e., a lambda or an application)
// 2 = fan (i.e., a pair or a let)
// gas cost = 18 + 3*
var kind = [
    // Stack contains node_id -> x
    node,
    MLOAD,
    PUSH32, "000000000000000000000000000000000000000000000000ffffffffffffffff",
    AND,
    // Stack contains kind -> x
].join("");

// NOT WORKING
// link(nodeA, nodeB, slotA, slotB) -- Links two ports
// gas cost = 6 + 6*
var link = [




    //TODO: Each MLOAD in tthis function stores a whole 256 bits word from memory, not just the
    //      value for node port. Find a solution to this problem.
    // Stack contains: portA -> portB -> x
    DUP1, // Duplicate portA
    DUP3, // Duplicate portB
    // Now stack is: PortB -> PortA -> PortA -> PortB -> x
    MSTORE, // mem[PortB] = PortA
    MSTORE  // mem[PortA] = PortB
    // Now stack is: x
].join("");

// NOT WORKING
// rewrite(nodeX, nodeY) -- Rewrites an active pair
// gas cost: kind(x) == kind(y) ? (true = 125 + 24*) : (false = 683 + 108*)
var rewrite = [
    // Stack contains nodeX -> nodeY -> x
    DUP2,
    kind,
    DUP2,
    kind,
    EQ,
    PUSH1, "xxxxx",
    JUMPI
    /* else */,
    // Stack contains: nodeX -> nodeY -> x
    DUP1,
    kind,
    new_node,
    PUSH1, BUFFER_SIZE_POS,
    MLOAD,
    // Stack contains: newNodeA -> nodeX -> nodeY -> x
    DUP3,
    kind,
    new_node,
    PUSH1, BUFFER_SIZE_POS,
    MLOAD,

    // Stack contains: newNodeB -> newNodeA -> nodeX -> nodeY -> x
    PUSH1, "01",
    DUP3,
    port,
    enter,
    PUSH1, "00",
    DUP2,
    port,
    link, // link(enter(port(x,1)), port(b, 0))
    // Stack contains: newNodeB -> newNodeA -> nodeX -> nodeY -> x
    PUSH1, "00",
    DUP5,
    port,
    PUSH1, "02",
    DUP5,
    port,
    enter,
    link, // link(port(y,0), enter(port(x, 2)))
    // Stack contains: newNodeB -> newNodeA -> nodeX -> nodeY -> x
    PUSH1, "01",
    DUP5,
    port,
    enter,
    PUSH1, "00",
    DUP4,
    port,
    link, //link(enter(port(y,1)), port(a, 0))
    // Stack contains: newNodeB -> newNodeA -> nodeX -> nodeY -> x
    PUSH1, "02",
    DUP5,
    port,
    enter,
    PUSH1, "00",
    DUP5,
    port,
    link, //link(enter(port(y,2)), port(x, 0))

    // Stack contains: newNodeB -> newNodeA -> nodeX -> nodeY -> x
    PUSH1, "01",
    DUP3,
    port,
    PUSH1, "01",
    DUP3,
    port,
    link, //link(net, port(a, 1), port(b, 1));
    // Stack contains: newNodeB -> newNodeA -> nodeX -> nodeY -> x
    PUSH1, "02",
    port,
    PUSH1, "01",
    DUP3,
    port,
    link, //link(net, port(x, 1), port(b, 2));
    // Stack contains: newNodeA -> nodeX -> nodeY -> x
    PUSH1, "02",
    port,
    PUSH1, "01",
    DUP4,
    port,
    link, //link(net, port(a, 2), port(y, 1));
    // Stack contains: nodeX -> nodeY -> x
    PUSH1, "02",
    port,
    PUSH1, "02",
    DUP3,
    port,
    link, //link(net, port(x, 2), port(y, 2));
    // Stack contains: nodeY -> x
    POP,
    // Stack contains: x
    // Jump to ent of function
    PUSH1, "yyyyy",
    JUMP,

    //=======================================
    /*if kind(x) == kind(y) -- gas cost = ??? */
    PUSH1, "01", // <----- Position "xxxxx"
    DUP2,
    port,
    enter,
    PUSH1, "01",
    DUP4,
    port,
    enter,
    link,

    PUSH1, "02",
    port,
    enter,
    PUSH1, "02",
    DUP3,
    port,
    enter,
    link,
    // Stack contains: x
    JUMPDEST // <------ Position "yyyyy"

].join("");

// NOT WORKING
// reduce() -- Reduces a net to normal form lazily and sequentially.
var reduce = [
    // TODO
    JUMPDEST,
    /*
    let mut warp : Vec<u32> = Vec::new();
    let mut exit : Vec<u32> = Vec::new();
    let mut next : Port = net.nodes[0];
    let mut prev : Port;
    let mut back : Port;
    */

    /* while next > 0 || warp.len() > 0 */

].join("");

////////////////////// TESTS //////////////////////
var nodeTest = [
    //should push position of node 0 to stack
    PUSH1, "00",
    node,
    //should push position of node 1 to stack
    PUSH1, "01",
    node,
].join("");

var portTest = [
    PUSH1, "00", // slot 0
    PUSH1, "00", // node 0
    port,
    PUSH1, "03", // slot 3 (kind)
    PUSH1, "00", // node 0
    port,
    PUSH1, "02", // slot 2
    PUSH1, "01", // node 1
    port,
].join("");

var addrTest = [
    PUSH1, "27",
    addr,
    PUSH1, "3f",
    addr,
    PUSH1, "57",
    addr,
].join("");

var slotTest = [
    PUSH1, "27",
    slot,
    PUSH1, "3f",
    slot,
    PUSH1, "47",
    slot,
].join("");

// NOT PASSING
var kindTest = [
    PUSH1, "00",
    kind,
    //PUSH1, "01",
    //kind,
].join("");
////////////////////// EVM CODE //////////////////////
var code = [
    // Load SIC graph to memory
    PUSH2, "ffff",
    PUSH1, "00",
    PUSH1, BUFFER_SIZE_POS,
    CALLDATACOPY,

    PUSH1, "27",
    PUSH1, "1f",
    SUB,
    PUSH1, "20",
    DIV,
    // Stop
    STOP
].join("");

const until = (stop, fn, val) => !stop(val) ? until(stop, fn, fn(val)) : val;
const lpad = (len, chr, str) => until((s) => s.length === len, (s) => chr + s, str);
const hex = (str) => "0x" + lpad(32, "0", str);
const repeat = (str, n) => n === 0 ? "" : str + repeat(str, n - 1);

vm.on("step", function ({pc, gasLeft, opcode, stack, depth, address, account, stateManager, memory, memoryWordCount}) {
    for (var i = 0; i < stack.length; ++i) {
      console.log("- " + i + ": " + hex(stack[i].toString("hex")));
    }
    console.log("PC: " + pc + " | GAS: " + gasLeft + " | OPCODE: " + opcode.name + " (" + opcode.fee + ")");
    console.log("MEM:", memory.slice(63, 87));
});

vm.runCode({
  code: Buffer.from(code, "hex"),
  gasLimit: Buffer.from("ffffffff", "hex"),
  //data: Buffer.from("000000000000000000000000000000000000000000000000000000000000002806020104081C000104180C010A1510010E1916011A0D120109111401052220011E241D01211C2500", "hex")
  data: Buffer.from(["0000000000000000000000000000000000000000000000000000000000000002", // size
                     "0000000000000004 0000000000000005 0000000000000006 0000000000000001", // node 1
                     "0000000000000000 0000000000000001 0000000000000002 0000000000000003", // node 2
                 ].join('').split(' ').join(''), "hex")
}, function (err, results) {
  console.log("code: " + code);
  console.log("returned: " + results.return.toString("hex"));
  console.log("gasUsed: " + results.gasUsed.toString());
  console.log(err);
})
