import { useEffect, useState, createContext, useContext } from "react";
import { subscribeVault } from "@/lib/vaultCache";

const VaultTick = createContext(0);

export function useVaultTick() {
  return useContext(VaultTick);
}

/** يعيد رسم الشاشات عندما تصل حقول الخزنة، بعد ما تكون القائمة ظاهرة. */
export default function VaultLive({ children }) {
  const [tick, setTick] = useState(0);
  useEffect(() => subscribeVault(() => setTick((n) => n + 1)), []);
  return <VaultTick.Provider value={tick}>{children}</VaultTick.Provider>;
}
