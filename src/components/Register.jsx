import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { register } from '../actions/userActions';
import styled from 'styled-components';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Register = ({ history }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const dispatch = useDispatch();
    const userRegister = useSelector((state) => state.userRegister);
    const { loading, error, userInfo } = userRegister;

    const submitHandler = (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert('Passwords do not match');
        } else {
            dispatch(register(name, email, password));
        }
    };

    if (userInfo) {
        history.push('/');
    }

    return (
        <RegisterContainer>
            <h1>Register</h1>
            {error && <ErrorMessage>{error}</ErrorMessage>}
            {loading && <LoadingMessage>Loading...</LoadingMessage>}
            <Form onSubmit={submitHandler}>
                <Input
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <PasswordWrapper>
                    <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <EyeIcon onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </EyeIcon>
                </PasswordWrapper>
                <PasswordWrapper>
                    <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <EyeIcon onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </EyeIcon>
                </PasswordWrapper>
                <Button type="submit">Register</Button>
            </Form>
        </RegisterContainer>
    );
};

export default Register;

const RegisterContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 20px;
    background: #f8f9fa;
`;

const Form = styled.form`
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 400px;
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
`;

const Input = styled.input`
    width: 100%;
    padding: 10px;
    margin: 10px 0;
    border: 1px solid #ccc;
    border-radius: 5px;
    font-size: 16px;
`;

const PasswordWrapper = styled.div`
    display: flex;
    align-items: center;
    position: relative;
`;

const EyeIcon = styled.div`
    position: absolute;
    right: 10px;
    cursor: pointer;
    font-size: 18px;
    color: #777;
`;

const Button = styled.button`
    background: #007bff;
    color: white;
    padding: 10px;
    border: none;
    border-radius: 5px;
    font-size: 18px;
    cursor: pointer;
    margin-top: 10px;
    transition: background 0.3s ease;
    &:hover {
        background: #0056b3;
    }
`;

const ErrorMessage = styled.div`
    color: red;
    margin-bottom: 10px;
`;

const LoadingMessage = styled.div`
    color: #007bff;
    margin-bottom: 10px;
`;
