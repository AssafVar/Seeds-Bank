import { Alert, Box, Button, Link as MuiLink, TextField, Typography } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { useNavigate } from 'react-router';
import { extractErrorMessage } from '../../services/serverCalls';
import { InlineSpinner } from '../common/Spinner.jsx';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function RegisterForm({isSignup, setIsSignup, handleLogin}) {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [registerError, setRegisterError] = useState('');
    const [registerMessage, setRegisterMessage] = useState('');

    const [registerType, setRegisterType] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {onLogin} = useAuth();
    const navigate = useNavigate();

    const errorTimer = useRef(null);

    // Errors fade after 2s, except "too many attempts": that one stays until the
    // user submits again, so they can read how long to wait.
    const showError = (message, { persist = false } = {}) => {
        clearTimeout(errorTimer.current);
        setRegisterError(message);
        if (!persist) {
            errorTimer.current = setTimeout(() => setRegisterError(""), 2000);
        }
    };

    useEffect(() => () => clearTimeout(errorTimer.current), []);

    const validate = () => {
        if (!email || !password || (isSignup && !confirmPassword)) {
            return "Please fill in all fields";
        }
        if (!EMAIL_REGEX.test(email)) {
            return "Please enter a valid email address";
        }
        if (isSignup && password.length < MIN_PASSWORD_LENGTH) {
            return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
        }
        if (isSignup && password !== confirmPassword) {
            return "Passwords do not match";
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearTimeout(errorTimer.current);
        setRegisterError("");
        const validationError = validate();
        if (validationError) {
            showError(validationError);
            return;
        }
        setIsSubmitting(true);
        try {
            await onLogin(email, password, registerType);
            if (registerType === "login") {
                setRegisterMessage("Login successful");
                setTimeout(() => {
                    setRegisterMessage("");
                    handleLogin();
                    navigate('/');
                }, 1000);
            } else {
                setRegisterMessage("Account created — log in to continue");
                setPassword('');
                setConfirmPassword('');
                setTimeout(() => {
                    setRegisterMessage("");
                    setIsSignup(false);
                }, 1500);
            }
        } catch (err) {
            showError(extractErrorMessage(err), { persist: err?.response?.status === 429 });
        } finally {
            setIsSubmitting(false);
        }
    }

    useEffect(()=>{
        setRegisterType(isSignup ? "signup" : "login");
    },[isSignup]);

    return (
        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
        >
            <TextField
                label="Email" type="email" fullWidth required
                value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
                label="Password" type="password" fullWidth required
                value={password}
                autoComplete={isSignup ? "new-password" : "current-password"}
                onChange={(e) => setPassword(e.target.value)}
            />
            {isSignup && (
                <TextField
                    label="Confirm password" type="password" fullWidth required
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                />
            )}
            <Button type="submit" variant="contained" size="large" fullWidth disabled={isSubmitting}>
                {isSubmitting ? <InlineSpinner size={24} /> : (isSignup ? "Create Account" : "Log In")}
            </Button>
            {registerError && <Alert severity="error">{registerError}</Alert>}
            {registerMessage && <Alert severity="success">{registerMessage}</Alert>}
            <Typography variant="body2" textAlign="left">
                {isSignup ? "Already have an account? " : "Don't have an account? "}
                <MuiLink component="button" type="button" onClick={() => setIsSignup(!isSignup)}>
                    {isSignup ? "Log in" : "Sign up"}
                </MuiLink>
            </Typography>
        </Box>
    );
}

export default RegisterForm;
