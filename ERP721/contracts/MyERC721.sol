// contracts/MyERC721.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // Using Solidity 0.8.20 or newer

import {ERC721URIStorage, ERC721} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";


contract MyERC721 is ERC721URIStorage {
    uint256 private _nextTokenId;

    constructor() ERC721("GameItem", "ITM") {}

    function mintAsset(address to, uint256 tokenId, string memory tokenUri) public onlyOwner {
        require(to != address(0), "ERC721: mint to the zero address");
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenUri);

    }

    function transferAsset(address to, uint256 tokenId) public {
        address currentOwner = ownerOf(tokenId);
        require(
            _isAuthorized(msg.sender, tokenId),
            "ERC721: transfer caller is not owner nor approved"
        );

        _safeTransfer(currentOwner, to, tokenId, "");
    }

}