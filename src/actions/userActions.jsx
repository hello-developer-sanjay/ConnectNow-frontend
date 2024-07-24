import axios from 'axios';
import {
    USER_REGISTER_REQUEST,
    USER_REGISTER_SUCCESS,
    USER_REGISTER_FAIL,
    USER_LOGIN_REQUEST,
    USER_LOGIN_SUCCESS,
    USER_LOGIN_FAIL,
    USER_LIST_REQUEST,
    USER_LIST_SUCCESS,
    USER_LIST_FAIL,
} from '../constants/userConstants';

export const register = (name, email, password) => async (dispatch) => {
    try {
        console.log('Register action started');
        dispatch({ type: USER_REGISTER_REQUEST });

        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        console.log('Sending register request to the server');
        const { data } = await axios.post('https://connectnow-backend-24july.onrender.com/api/users/register', { name, email, password }, config);

        console.log('Register request successful:', data);
        dispatch({ type: USER_REGISTER_SUCCESS, payload: data });
        dispatch({ type: USER_LOGIN_SUCCESS, payload: data });

        localStorage.setItem('userInfo', JSON.stringify(data));
        localStorage.setItem('token', data.token);
    } catch (error) {
        console.error('Register request failed:', error.response ? error.response.data.message : error.message);
        dispatch({
            type: USER_REGISTER_FAIL,
            payload: error.response && error.response.data.message
                ? error.response.data.message
                : error.message,
        });
    }
};

export const login = (email, password) => async (dispatch) => {
    try {
        console.log('Login action started');
        dispatch({ type: USER_LOGIN_REQUEST });

        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        console.log('Sending login request to the server');
        const { data } = await axios.post('https://connectnow-backend-24july.onrender.com/api/users/login', { email, password }, config);

        console.log('Login request successful:', data);
        dispatch({ type: USER_LOGIN_SUCCESS, payload: data });

        localStorage.setItem('userInfo', JSON.stringify(data));
        localStorage.setItem('token', data.token);

    } catch (error) {
        console.error('Login request failed:', error.response ? error.response.data.message : error.message);
        dispatch({
            type: USER_LOGIN_FAIL,
            payload: error.response && error.response.data.message
                ? error.response.data.message
                : error.message,
        });
    }
};

export const listUsers = () => async (dispatch, getState) => {
    try {
        console.log('List users action started');
        dispatch({ type: USER_LIST_REQUEST });

        const {
            userLogin: { userInfo },
        } = getState();

        const config = {
            headers: {
                Authorization: `Bearer ${userInfo.token}`,
            },
        };

        console.log('Sending request to get the list of users');
        const { data } = await axios.get('https://connectnow-backend-24july.onrender.com/api/users', config);

        console.log('List users request successful:', data);
        dispatch({ type: USER_LIST_SUCCESS, payload: data });
    } catch (error) {
        console.error('List users request failed:', error.response ? error.response.data.message : error.message);
        dispatch({
            type: USER_LIST_FAIL,
            payload: error.response && error.response.data.message
                ? error.response.data.message
                : error.message,
        });
    }
};
