/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { useState, useEffect } from 'react';
import './app.css';
import { ethers } from 'ethers';
import contractABI from './utils/contractABI.json';
import twitterLogo from './assets/twitter-logo.svg';
import { networks } from './utils/networks';

import { useWeb3React } from '@web3-react/core';

import RecentlyMinted from './components/RecentlyMinted';
import ConnectionStatus from './components/ConnectionStatus';
import ConnectButton from './components/ConnectButton';
import Avatar from './components/Avatar';
import { InjectedConnector } from '@web3-react/injected-connector';
import video from './img/bg.mp4';
import img from './img/bottom.png';

const MetaMask = new InjectedConnector({});

const tld = 'dcns';

// Constants
const CONTRACT_ADDRESS = '0xb1ff187F653Fde17aaf7E3D33a0e3f96F3430830';

export type Record = {
  avatar: string;
  twitterTag: string;
  website: string;
  email: string;
  description: string;
  address: string;
};

export enum RecordType {
  AVATAR = 0,
  TWITTER = 1,
  WEBSITE = 2,
  EMAIL = 3,
  DESCRIPTION = 4
}

const App = () => {
  const { activate, active, account, library, chainId } = useWeb3React();
  const [domain, setDomain] = useState('');
  const [mintPrice, setMintPrice] = useState(0);

  const [records, setRecords] = useState<Record | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [mints, setMints] = useState<Array<any>>([]);

  // const web3React = useWeb3React();

  // web3React.activate(new InjectedConnector({
  //   supportedChainIds: [269]
  // }));
  // console.log({ web3React });


  useEffect(() => {
    //@ts-ignore
    //if (networks[chainId?.toString(16)] === 'Dogechain Mainnet') {
    //if( networks[chainId?.toString(16)]?.includes('DOGECHAIN') ){
      if (chainId == 269) {
      fetchMints();
      }
    //}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, chainId]);

  const switchNetwork = async () => {
    if (account) {
      try {
        // Try to switch to the Dogechain testnet
        await library.send(
          'wallet_switchEthereumChain',
          [{ chainId: '10D' }] // Check networks.js for hexadecimal network ids
        );
      } catch (error: any) {
        // This error code means that the chain we want has not been added to MetaMask
        // In this case we ask the user to add it to their MetaMask
        if (error.code === 4902) {
          try {
            await library.send('wallet_addEthereumChain', [
              {
                chainId: '568',
                chainName: 'DogeChain Testnet',
                rpcUrls: ['https://rpc-testnet.dogechain.dog'],
                nativeCurrency: {
                  name: 'DogeChain Testnet',
                  symbol: 'wDOGE',
                  decimals: 18
                },
                blockExplorerUrls: ['https://explorer-testnet.dogechain.dog']
              }
            ]);
          } catch (error) {
            console.log(error);
          }
        }
        console.log(error);
      }
    }
  };

  const updateDomain = async () => {
    if (!records || !domain) {
      return;
    }
    setLoading(true);
    try {
      if (active) {
        const signer = library.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, signer);

        const tx = await contract['setRecords'](
          domain,
          records.avatar,
          records.twitterTag,
          records.website,
          records.email,
          records.description
        );
        await tx.wait();
        console.log('Record set https://explorer-testnet.dogechain.dog/tx/' + tx.hash);

        fetchMints();
        setRecords(undefined);
        setDomain('');
      }
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };

  const fetchMints = async () => {
    try {
      //if (active) {
        const signer = library.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, signer);

        // Get all the domain names from our contract
        const names = await contract['getAllNames']();

        // For each name, get the record and the address
        const mintRecords = await Promise.all(
          names.map(async (name: string) => {
            const mintRecord = await contract['getRecord'](name, 4);
            const owner = await contract['getAddress'](name);
            return {
              id: names.indexOf(name) + 1,
              name: name,
              record: mintRecord,
              owner: owner
            };
          })
        );

        console.log('MINTS FETCHED ', mintRecords);
        setMints(mintRecords);
      //}
    } catch (error) {
      console.log(error);
    }
  };

  const mintDomain = async () => {
    // Don't run if the domain is empty
    if (!domain) {
      return;
    }

    // Alert the user if the domain is too short
    if (domain.length < 3) {
      alert('Domain must be at least 3 characters long');
      return;
    }
    // Calculate price based on length of domain (change this to match your contract)
    // 3 chars = 10 WDOGE, 4 chars = 1 WDOGE, 5 or more = 0.1 WDOGE
    const price = domain.length === 3 ? '10' : domain.length === 4 ? '1' : '0.1';
    console.log('Minting domain', domain, 'with price', price);
    try {
      if (active) {
        const signer = library.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, signer);

        console.log('Going to pop wallet now to pay gas...');
        const tx = await contract['register'](domain, {
          value: ethers.utils.parseEther(price), gasLimit: 3000000
        });
        // Wait for the transaction to be mined
        const receipt = await tx.wait();

        // Check if the transaction was successfully completed
        if (receipt.status === 1) {
          console.log('Domain minted! https://explorer-testnet.dogechain.dog/tx/' + tx.hash);

          setTimeout(() => {
            fetchMints();
          }, 2000);

          setRecords(undefined);
          setDomain('');
        } else {
          alert('Transaction failed! Please try again');
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const searchDomain = async (_domain = domain) => {
    if (!_domain) {
      return;
    }

    if (_domain.length < 3 || _domain.length > 12) return;

    const signer = library.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, signer);

    contract['getId'](_domain)
      .then(async () => {
        const res = await contract['getRecords'](_domain);
        const newRecords: Record = {
          avatar: res[0][RecordType.AVATAR],
          twitterTag: res[0][RecordType.TWITTER],
          description: res[0][RecordType.DESCRIPTION],
          email: res[0][RecordType.EMAIL],
          website: res[0][RecordType.WEBSITE],
          address: res[1]
        };

        setRecords(newRecords);
        console.log('NEW RECORDS SET');
      })
      .catch(() => {
        switch (_domain.length) {
          case 3:
            setMintPrice(10);
            break;
          case 4:
            setMintPrice(1);
            break;
          default:
            setMintPrice(0.1);
            break;
        }
      });
  };

  const renderInputForm = () => {
    //@ts-ignore
    //if( networks[chainId?.toString(16)]?.includes('DOGECHAIN') ){
    if (chainId !== 568) {
      return (
        <div className="connect-wallet-container">
          <h2>Connected to wrong network</h2>
          {/* This button will call our switch network function */}
          <button className="cta-button mint-button" onClick={switchNetwork}>
          Please switch to Dogechain Testnet
          </button>
        </div>
      );
    }

    return (
      <div className="form-container">
      <div className="first-row">
        <span id="domain" className="record">
          <input
            type="text"
            value={domain}
            placeholder="domain"
            onChange={e => {
              setRecords(undefined);
              setMintPrice(0);
              setDomain(e.target.value);
            }}
          />
          <p className="tld"> {tld} </p>
          </span>
        </div>
        {records && (
          <>
            <span id="addr" className="record">
              <input
                type="text"
                value={records.address}
                placeholder="enter"
                readOnly={true}
                className="readonly"
              />
            </span>
            <span id="desc" className="record">
              <input
                type="text"
                value={records.description}
                placeholder="enter"
                onChange={e => setRecords({ ...records, description: e.target.value })}
                readOnly={account?.toLowerCase() !== records.address.toLowerCase()}
                className={account?.toLowerCase() !== records.address.toLowerCase() ? 'readonly' : ''}
              />
            </span>
            <span id="email" className="record">
              <input
                type="text"
                value={records.email}
                placeholder="enter"
                onChange={e => setRecords({ ...records, email: e.target.value })}
                readOnly={account?.toLowerCase() !== records.address.toLowerCase()}
                className={account?.toLowerCase() !== records.address.toLowerCase() ? 'readonly' : ''}
              />
            </span>
            <span id="website" className="record">
              <input
                type="text"
                value={records.website}
                placeholder="enter"
                onChange={e => setRecords({ ...records, website: e.target.value })}
                readOnly={account?.toLowerCase() !== records.address.toLowerCase()}
                className={account?.toLowerCase() !== records.address.toLowerCase() ? 'readonly' : ''}
              />
            </span>
            <span id="twitter" className="record">
              <input
                type="text"
                value={records.twitterTag}
                placeholder="enter"
                onChange={e => setRecords({ ...records, twitterTag: e.target.value })}
                readOnly={account?.toLowerCase() !== records.address.toLowerCase()}
                className={account?.toLowerCase() !== records.address.toLowerCase() ? 'readonly' : ''}
              />
            </span>
            <span id="avatar" className="record">
              <input
                type="text"
                value={records.avatar}
                placeholder="enter"
                onChange={e => setRecords({ ...records, avatar: e.target.value })}
                readOnly={account?.toLowerCase() !== records.address.toLowerCase()}
                className={account?.toLowerCase() !== records.address.toLowerCase() ? 'readonly' : ''}
              />
            </span>
            <Avatar domain={domain} url={records.avatar} />
          </>
        )}
        <div className="button-container">
          <button
            className="cta-button mint-button"
            disabled={loading}
            onClick={() => {
              searchDomain();
            }}
          >
            Search
          </button>
          {records ? (
            <button className="cta-button mint-button" disabled={loading} onClick={updateDomain}>
              Update
            </button>
          ) : mintPrice > 0 ? (
            <button className="cta-button mint-button" disabled={loading} onClick={mintDomain}>
              Mint for {mintPrice} $WDOGE
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <header className="flex">
            <div className="flex-item">
              <p className="title">DOGECHAIN NAME</p>
            </div>
              <ConnectionStatus />
          </header>
        </div>

        <div className="main-container-wrapper">
          <video autoPlay loop muted>
            <source src={video} type="video/mp4"/>
          </video>
          <div className="main-container flex">
          {active ? renderInputForm() :
          <>
            <div className="flex-item left">
              <h1>Dogechain<br/>Names
              <button
              className="cta-button connect-wallet-button"
              onClick={() => {
                activate(MetaMask);
              }}
            >
              Connect Wallet
              </button>
              </h1>
            </div>
            <ConnectButton/>
            {/*mints && renderMints()*/}
            </>
          }
          </div>
        </div>

        <div className="recently-minted">
          <RecentlyMinted
              mints={mints}
              onEdit={(name: string) => {
                setDomain(name);
                searchDomain(name);
              }}
            />
        </div>

        <div className="footer-container">
          <a
            className="footer-text"
            href="https://twitter.com/dogechainnames"
            target="_blank"
            rel="noreferrer"
          >Twitter x Follow</a>
        </div>
      </div>
    </div>
  );
};

export default App;
