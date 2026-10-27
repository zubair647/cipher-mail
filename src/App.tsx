import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./state/AuthContext";
import { SignIn } from "./screens/SignIn";
import { ConsentHelper } from "./screens/ConsentHelper";
import { Home } from "./screens/Home";
import { Variables } from "./screens/Variables";
import { Upload } from "./screens/Upload";
import { Mapping } from "./screens/Mapping";
import { Compose } from "./screens/Compose";
import { Preview } from "./screens/Preview";
import { TestSend } from "./screens/TestSend";
import { Confirm } from "./screens/Confirm";
import { Sending } from "./screens/Sending";
import { Summary } from "./screens/Summary";
import { Settings } from "./screens/Settings";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { account, ready, consentRequired } = useAuth();
  const loc = useLocation();
  if (!ready) return <FullScreenLoading />;
  if (consentRequired) return <Navigate to="/consent" replace />;
  if (!account) return <Navigate to="/" replace state={{ from: loc.pathname }} />;
  return children;
}

function FullScreenLoading() {
  return (
    <div className="center-screen">
      <div className="muted">Loading…</div>
    </div>
  );
}

export default function App() {
  const { account, ready, consentRequired } = useAuth();
  return (
    <Routes>
      <Route
        path="/"
        element={
          !ready ? <FullScreenLoading /> : consentRequired ? <Navigate to="/consent" replace /> : account ? <Home /> : <SignIn />
        }
      />
      <Route path="/consent" element={<ConsentHelper />} />
      <Route path="/campaign/variables" element={<RequireAuth><Variables /></RequireAuth>} />
      <Route path="/campaign/upload" element={<RequireAuth><Upload /></RequireAuth>} />
      <Route path="/campaign/map" element={<RequireAuth><Mapping /></RequireAuth>} />
      <Route path="/campaign/compose" element={<RequireAuth><Compose /></RequireAuth>} />
      <Route path="/campaign/preview" element={<RequireAuth><Preview /></RequireAuth>} />
      <Route path="/campaign/test" element={<RequireAuth><TestSend /></RequireAuth>} />
      <Route path="/campaign/confirm" element={<RequireAuth><Confirm /></RequireAuth>} />
      <Route path="/campaign/sending" element={<RequireAuth><Sending /></RequireAuth>} />
      <Route path="/campaign/summary" element={<RequireAuth><Summary /></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
