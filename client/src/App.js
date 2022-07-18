import 'bootstrap/dist/css/bootstrap.min.css';
import React, { Component } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { isLoggedIn, Login } from './login/Login';
import Viewer from './viewer/Viewer';

class App extends Component {
    render() {
        return (
            <BrowserRouter>
                <Routes>
                    { /* If the user is logged in, the landing will redirect to viewer, otherwise it will prompt the login */}
                    <Route path='/' element={<Navigate to={(isLoggedIn() ? '/viewer' : '/login')} />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/viewer" element={<Viewer />} />
                </Routes>
            </BrowserRouter>
        )
    }
}

export default App