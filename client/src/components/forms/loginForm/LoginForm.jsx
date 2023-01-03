import { Button, TextField } from '@mui/material';
import { Box } from '@mui/system';
import React, { useState } from 'react';
import { loginUser } from '../../../libs/serverCalls';

function LoginForm({handleLogin}) {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault()
        try{
            const results = await loginUser(email,password);
            handleLogin()
            console.log("results are", results.data);
        }catch(err){
            setLoginError(true)
            console.log("err are", err);
        }
    }
    return (
        <Box component="form"
            sx={{
            '& .MuiTextField-root': { m: 1, width: '25ch' },
          }}
          noValidate
          autoComplete="off">
            <div >
                <TextField id="email" label="email" variant="standard" required
                value={email} autoComplete='username' onChange={(e) =>setEmail(e.target.value)}
                />
                <br/>
                <TextField id="password" label="Password" type="password" variant="standard" required
                value={password} autoComplete='current-password' onChange={(e) =>setPassword(e.target.value)}
                />
                <Button onClick={handleSubmit}>Submit </Button>
            </div>
            {loginError && <span> Failed to login : wrong email or password</span>}
        </Box>
    );
}

export default LoginForm;