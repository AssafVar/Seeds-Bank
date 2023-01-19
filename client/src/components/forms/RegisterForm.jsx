import { Button, TextField } from '@mui/material';
import { Box } from '@mui/system';
import React, { useEffect, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import "./registerForm.css";

function RegisterForm({isSignup, handleLogin}) {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [url, setUrl] = useState('');
    const [registerError, setRegisterError] = useState('');
    const {onLogin} = useAuth();
    const handleSubmit = async (e) => {
        e.preventDefault();
        if ( (password === confirmPassword && isSignup===true) || (isSignup===false) ){
            try{
                const results = await onLogin(email,password,url);
                results.status === 200 ? handleLogin() : setRegisterError("Could not register");
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
        isSignup ? setUrl("signup") : setUrl("login");
    },[]);
    return (
        <Box component="form"
            sx={{
            '& .MuiTextField-root': { m: 2, width: '25ch' },
          }}
          noValidate
          autoComplete="off">
            <div >
                <TextField id="email" label="email" variant="standard" required
                value={email} autoComplete='username' onChange={(e) =>setEmail(e.target.value)}
                /><br/>
                <TextField id="password" label="Password" type="password" variant="standard" required
                value={password} autoComplete='current-password' onChange={(e) =>setPassword(e.target.value)}
                /><br/>
                {isSignup&&<TextField id="confirm-password" label="Confirm password" type="password" variant="standard" required
                value={confirmPassword} autoComplete='' onChange={(e) =>setConfirmPassword(e.target.value)}
                />}
            </div>
            <Button onClick={handleSubmit}>Submit </Button><br/>
            {registerError && <div className='alert'> <div >{registerError}</div></div>}
            
        </Box>
    );
}

export default RegisterForm;