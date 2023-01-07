import { useState } from 'react';
import AuthContext from '../contexts/AuthContext.js';
import { confirmUser } from '../services/serverCalls';


function AuthProvider({children}) {
    const [activeUser, setActiveUser] = useState(
        localStorage.activeUser ? JSON.parse(localStorage.activeUser) : null
    );

    async function handleLogin(username, password, register) {
        const user = await confirmUser(username, password, register);
        localStorage.activeUser = JSON.stringify(user);
        setActiveUser(user);
    }
    async function handleLogout(e) {
        localStorage.removeItem("activeUser");
        setActiveUser(null);
      }
    
      return (
        <AuthContext.Provider
          value={{ activeUser, onLogin: handleLogin, onLogout: handleLogout }}
        >
          {children}
        </AuthContext.Provider>
      );
}
export default AuthProvider;
