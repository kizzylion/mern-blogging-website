import Navbar from "./components/navbar.component";
import { Routes, Route } from "react-router-dom";
import UserAuthForm from "./pages/userAuthForm.page";
import { createContext, useEffect, useState } from "react";
import { lookInSession } from "./common/session";
import Editor from "./pages/editor.pages";
import Homepage from "./pages/home.page";

export const UserContext = createContext({});

const App = () => {
  const [userAuth, setUserAuth] = useState({});

  useEffect(() => {
    let userInSession = lookInSession("user");

    userInSession
      ? setUserAuth(JSON.parse(userInSession))
      : setUserAuth({ access_token: null });
  }, []);
  return (
    <div>
      <UserContext.Provider value={{ userAuth, setUserAuth }}>
        <Routes>
          <Route path="/editor" element={<Editor />} />
          <Route path="/" element={<Navbar />}>
            <Route index element={<Homepage />} />
            <Route path="/signin" element={<UserAuthForm type="sign-in" />} />
            <Route path="/signup" element={<UserAuthForm type="sign-up" />} />
          </Route>
        </Routes>
      </UserContext.Provider>
    </div>
  );
};

export default App;
