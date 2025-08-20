# TrustDiploma

A decentralized platform for issuing, storing, and verifying academic credentials on the blockchain, eliminating fraud, reducing verification costs, and enabling instant global access for students, institutions, and employers — all on-chain.

---

## Overview

TrustDiploma consists of four main smart contracts that together form a secure, transparent, and efficient ecosystem for academic credential management:

1. **Institution Registry Contract** – Registers and verifies educational institutions.
2. **Credential NFT Contract** – Issues and manages academic credentials as NFTs.
3. **Verification Contract** – Handles queries and on-chain verification of credentials.
4. **Revocation Contract** – Allows institutions to revoke credentials if necessary.

---

## Features

- **Institution registration** with verification to ensure authenticity  
- **NFT-based credentials** for tamper-proof diplomas, transcripts, and certifications  
- **Instant verification** accessible to employers or third parties  
- **Revocation mechanism** for handling errors or fraud  
- **Privacy-preserving queries** to confirm credentials without revealing full details  
- **On-chain audit trails** for all issuances and verifications  
- **Integration with user wallets** for seamless ownership and transfer  

---

## Smart Contracts

### Institution Registry Contract
- Register institutions with proof of authenticity (e.g., via admin or oracle verification)
- Manage institution profiles and public keys
- Query for verified institution status

### Credential NFT Contract
- Mint credentials as NFTs tied to student identities
- Store metadata like degree details, grades, and issuance date
- Transfer ownership (e.g., for wallet migrations) with restrictions

### Verification Contract
- Public functions to verify credential authenticity and details
- Check against institution signatures and revocation status
- Event logging for verification attempts

### Revocation Contract
- Institutions can revoke credentials with justification
- Maintain a revocation list for quick checks
- Notify credential holders via events

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started)
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/trustdiploma.git
   ```
3. Run tests:
    ```bash
    npm test
    ```
4. Deploy contracts:
    ```bash
    clarinet deploy
    ```

## Usage

Each smart contract operates independently but integrates with others for a complete credential verification experience.
Refer to individual contract documentation for function calls, parameters, and usage examples.

## License

MIT License
