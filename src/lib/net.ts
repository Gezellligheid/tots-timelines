/** Connection state shared by non-React code. `simulated` is a development switch (Profile, dev only). */
let simulated = false;

export const setSimulatedOffline = (v: boolean) => {
  simulated = v;
};
export const isOnline = () => (typeof navigator === "undefined" ? true : navigator.onLine) && !simulated;
