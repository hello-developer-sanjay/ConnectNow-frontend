import { combineReducers } from 'redux';
import {
    userLoginReducer,
    userRegisterReducer,
    userListReducer,
} from './userReducers';

const rootReducer = combineReducers({
    userLogin: userLoginReducer,
    userRegister: userRegisterReducer,
    userList: userListReducer,
});

export default rootReducer;
