pragma solidity >=0.7.0 <0.8.9;

// SPDX-License-Identifier: UNLICENSED

contract HelloHedera {
    mapping(address => bool) public delegationStatus;

    struct Numbers {
        uint64 num1;
        uint64 num2;
    }

    Numbers numbers;

    // the message we're storing
    string message;

    constructor(string memory message_) {
        message = message_;
    }

    // set message and caller_address to look in get_message
    function set_message(string memory message_) public {
        message = message_;
    }

    // return a (message, caller_address, count)
    function get_message() public view returns (string memory) {
        return (message);
    }

    function set_numbers(string memory message_, Numbers memory numbers_) public {
        numbers.num1 = numbers_.num1;
        numbers.num2 = numbers_.num2;
        message = message_;
    }

    function get_sum() public view returns (string memory, uint64) {
        return (message, numbers.num1 + numbers.num2);
    }

    function revert_fnc() public {
        revert("Return revert");
    }

    function functionRequiringDelegate() public view returns (string memory) {
        require(delegationStatus[msg.sender], "No delegate set");
        return "Function executed successfully with delegate";
    }

    function setDelegate(address _delegate) public {
        delegationStatus[_delegate] = true;
    }
}
