import React, { useContext } from "react";
import { useNavigate } from "react-router";
import authContext from "./AuthContext";

function AdminRoute({ children }) {
  const navigate = useNavigate();
  const { activeUser } = useContext(authContext);

  if (!activeUser?.isAdmin) {
    navigate("/");
  }
  return <>{children}</>;
}

export default AdminRoute;
