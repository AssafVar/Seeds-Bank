import React, { useContext } from "react";
import { useNavigate } from "react-router";
import authContext from "./AuthContext";

function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const { activeUser } = useContext(authContext);

  if (!activeUser) {
    navigate("/");
  }
  return <>{children}</>;
}

export default ProtectedRoute;
