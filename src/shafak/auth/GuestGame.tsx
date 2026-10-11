import ShafakApp from "../App";

export default function GuestGame() {
  return (
    <ShafakApp
      user={null}
      authLoaded={false}
      allowOfflineGuest
      signOut={async () => undefined}
    />
  );
}
