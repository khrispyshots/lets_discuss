import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';
const MetaMask = new InjectedConnector({});

export default function ConnectButton() {
  const { activate } = useWeb3React();

  return (
    <div className="connect-wallet-container flex-item right">
      <p>Own your unique .dcns name</p>
    </div>
  );
}
