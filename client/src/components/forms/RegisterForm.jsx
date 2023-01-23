import { Button, TextField } from '@mui/material';
import { Box } from '@mui/system';
import React, { useEffect, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import Alert from '@mui/material/Alert';
import "./registerForm.css";
import { useNavigate } from 'react-router';

function RegisterForm({isSignup, handleLogin}) {

    const [userName, setUserName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [registerError, setRegisterError] = useState('');
    const [registerMessage, setRegisterMessage] = useState('');

    const [registerType, setRegisterType] = useState('');

    const {onLogin} = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if ( (password === confirmPassword && isSignup===true) || (isSignup===false) ){
            try{
                const response = await onLogin(userName, email, password ,registerType);
                if (response.status === 200 && registerType === "login") {
                    setRegisterMessage("Login successful");
                    setTimeout(()=>{
                        setRegisterMessage("");
                        handleLogin();
                        navigate('/');
                    },1000)
                }else if(response.status === 200 && registerType === "signup"){
                    setRegisterMessage("Signup successful. please login to your account");
                    setTimeout(()=>{
                        setRegisterMessage("");
                        handleLogin();
                    },2000)
                    
                }else{
                    setRegisterError(response.response.data);
                    setTimeout(()=>{setRegisterError("")},2000)
                }
            }catch(err){
                console.log(err);
            }
        }else if (password !== confirmPassword){
            setPassword('');
            setConfirmPassword('');
            setRegisterError("Passwords do not match");
            setTimeout(()=>{setRegisterError("")},2000)
        }
    }
    
    useEffect(()=>{
        isSignup ? setRegisterType("signup") : setRegisterType("login");
    },[]);

    return (
        <Box component="form"
            sx={{
            '& .MuiTextField-root': { m: 2, width: '25ch' },
          }}
          noValidate
          autoComplete="off">
            <div >
                <TextField id="userName" label="userName" variant="standard" required
                value={userName} autoComplete='username' onChange={(e) =>setUserName(e.target.value)}
                /><br/>
                <TextField id="email" label="email" variant="standard" required
                value={email} autoComplete='email' onChange={(e) =>setEmail(e.target.value)}
                /><br/>
                <TextField id="password" label="Password" type="password" variant="standard" required
                value={password} autoComplete='current-password' onChange={(e) =>setPassword(e.target.value)}
                /><br/>
                {isSignup&&<TextField id="confirm-password" label="Confirm password" type="password" variant="standard" required
                value={confirmPassword} autoComplete='' onChange={(e) =>setConfirmPassword(e.target.value)}
                />}
            </div>
            <Button onClick={handleSubmit}>Submit </Button><br/>
            {registerError && <Alert severity="error">{registerError}</Alert>}
            {registerMessage && <Alert severity='success'>{registerMessage}</Alert>}
        </Box>
    );
}

export default RegisterForm;