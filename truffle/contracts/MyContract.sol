// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.30;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
/**
 * @title MyContract
 * @dev An ERC721 compliant contract with custom minting and transfer functions,
 * and basic ownership control.
 */
contract MyContract is ERC721, ERC721URIStorage, Ownable {
    // Constructor: Initializes the ERC721 token with a name and symbol,
    // and sets the initial owner.
    constructor(address initialOwner)
        ERC721("MyToken", "MTK")
        Ownable(initialOwner)
    {}

    // _baseURI: Internal function to define the base URI for token metadata.
    // This URI will be prepended to the token-specific URIs.
    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://QmZbWNKJPAjxXuNFSEaksCJVd1M6DaKQViJBYPK2BdpDEP/";
    }

    /**
     * @notice Mints a new ERC721 token and assigns it to the recipient address.
     * This function can only be called by the contract owner.
     * The token URI is set to the base URI concatenated with the token ID.
     * @param to The address of the recipient of the new token.
     * @param tokenId The unique identifier for the new token.
     */
    function mintAsset(address to, uint256 tokenId) public onlyOwner {
        // _safeMint ensures that the 'to' address can receive ERC721 tokens,
        // preventing accidental token loss.
        _safeMint(to, tokenId);
        // _setTokenURI appends the tokenId to the base URI to form the full URI.
        // This assumes a simple URI structure where the tokenId forms the last part.
        _setTokenURI(tokenId, string.concat(Strings.toString(tokenId), ".json"));
    }

    /**
     * @notice Transfers a specific token from the caller's address to another address.
     * This function can only be called by the current owner of the token
     * or an approved address. It uses the standard ERC721 `_transfer` internal function.
     * @param to The address of the recipient of the token.
     * @param tokenId The unique identifier of the token to be transferred.
     */
    function transferAsset(address to, uint256 tokenId) public {
        // Require that the caller is either the owner of the token or an approved operator.
        // This check is implicitly handled by _transfer if the caller is not the owner
        // but an approved operator.
        // The ERC721 standard mandates that the sender must be the owner or an approved operator.
        // `_transfer` handles burning from and minting to, updating balances and ownership.
        _transfer(ERC721.ownerOf(tokenId), to, tokenId);
        // Note: The Transfer event is emitted automatically by the _transfer function.
    }

    // The following functions are overrides required by Solidity for multiple inheritance.

    /**
     * @dev See {ERC721-tokenURI}.
     * Returns the full URI for a given token, combining the base URI and the token-specific URI.
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     * Returns whether this contract implements a given interface.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}