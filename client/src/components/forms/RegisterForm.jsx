import { Button, TextField } from '@mui/material';
import { Box } from '@mui/system';
import React, { useState } from 'react';
import { confirmUser } from '../../libs/serverCalls';
import "./registerForm.css";

function RegisterForm({isSignup}) {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [url, setUrl] = useState('');
    const [registerError, setRegisterError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault()
        if ( (password === confirmPassword && isSignup===true) || (isSignup===false) ){
            isSignup ? setUrl("signup") : setUrl("login");
            try{
                const results = await confirmUser(email,password,url);
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