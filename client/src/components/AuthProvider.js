import { useState } from 'react';
import AuthContext from '../contexts/AuthContext.js';
import { confirmUser } from '../services/serverCalls';


function AuthProvider({children}) {
    const [activeUser, setActiveUser] = useState(
        localStorage.activeUser ? JSON.parse(localStorage.activeUser) : null
    );

    async function handleLogin(email, password, register) {
        const response = await confirmUser(email, password, register);
        if (register === "login") {
          localStorage.activeUser = JSON.stringify(response.data);
          setActiveUser(response.data);
        }
        return response;
    }
    async function handleLogout(e) {
        localStorage.removeItem("activeUser");
        setActiveUser(null);
      }
    function updateActiveUser(patch) {
        const updatedUser = { ...activeUser, ...patch };
        localStorage.activeUser = JSON.stringify(updatedUser);
        setActiveUser(updatedUser);
    }

      return (
        <AuthContext.Provider
          value={{ activeUser, onLogin: handleLogin, onLogout: handleLogout, updateActiveUser }}
        >
          {children}
        </AuthContext.Provider>
      );
}
export default AuthProvider;
