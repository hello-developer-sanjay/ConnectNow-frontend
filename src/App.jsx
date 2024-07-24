import { BrowserRouter as Router, Route } from 'react-router-dom';
import Register from './components/Register';
    
import Chat from './components/Chat';
import Login from './components/Login';
import Layout from './components/Layout'; 
import SignInSignUp from './components/SignInSignUp';

const App = () => {
    return (
        <Router>
                                  <Layout>

            <Route path="/" component={Chat} exact />
            <Route path="/login" component={SignInSignUp } />
            <Route path="/register" component={Register} />
            </Layout>

        </Router>
    );
};

export default App;
