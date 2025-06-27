import { Link, Navigate } from "react-router-dom";
import InputBox from "../components/input.component";
import googleIcon from "../imgs/google.png";
import AnimationWrapper from "../common/page-animation";
import { useContext, useRef, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import axios from "axios";
import { storeInSession } from "../common/session";
import { UserContext } from "../App";
import { authWithGoogle } from "../common/firebase";

const UserAuthForm = ({ type }) => {
  let {
    userAuth: { access_token },
    setUserAuth,
  } = useContext(UserContext);

  const userAuthThroughServer = (serverRoute, formData) => {
    axios
      .post(import.meta.env.VITE_SERVER_DOMAIN + serverRoute, formData)
      .then(({ data }) => {
        storeInSession("user", JSON.stringify(data));
        setUserAuth(data);
      })
      .catch(({ response }) => {
        toast.error(response.data.error);
      });
  };

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    let serverRoute = type == "sign-in" ? "/signin" : "/signup";

    setErrors({});
    setIsLoading(true);

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

    // Extract form data
    const form = new FormData(formElement); //the formElement is the value of the form id attribute
    let formData = {};
    for (let [key, value] of form.entries()) {
      formData[key] = value.trim(); // Trim whitespace
    }

    const { fullName, email, password } = formData;
    const newErrors = {};

    // Form validation
    if (type !== "sign-in" && (!fullName || fullName.length < 3)) {
      newErrors.fullName = "Full name must be at least 3 characters long";
    }

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (!passwordRegex.test(password)) {
      newErrors.password =
        "Password should be 6-20 characters with at least 1 number, 1 lowercase and 1 uppercase letter";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return toast.error(
        newErrors.fullName || newErrors.email || newErrors.password
      );
    }

    userAuthThroughServer(serverRoute, formData);
    try {
      // Here you would typically make an API call
      console.log("Form submitted:", formData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Handle successful submission
      console.log("Authentication successful");
    } catch (error) {
      console.error("Authentication failed:", error);
      setErrors({ general: "Authentication failed. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = (e) => {
    // Handle Google authentication

    e.preventDefault();

    authWithGoogle()
      .then((user) => {
        let serverRoute = "/google-auth";

        let formData = {
          access_token: user.accessToken,
        };

        userAuthThroughServer(serverRoute, formData);
      })
      .catch((err) => {
        toast.error("trouble login through google");
        return console.log(err);
      });
    console.log("Google authentication clicked");
    // Implement Google auth logic here
  };

  return access_token ? (
    <Navigate to={"/"} />
  ) : (
    <AnimationWrapper keyValue={type}>
      <section className="h-cover flex items-center justify-center">
        <Toaster />
        <form
          id="formElement"
          onSubmit={handleSubmit}
          className="w-[80%] max-w-[400px]"
          noValidate
        >
          <h1 className="text-4xl font-gelasio capitalize text-center mb-24">
            {type === "sign-in" ? "Welcome back" : "Join us today"}
          </h1>

          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {errors.general}
            </div>
          )}

          {type !== "sign-in" && (
            <div className="mb-4">
              <InputBox
                name="fullName"
                type="text"
                id="fullName"
                placeholder="Full Name"
                icon="fi-rr-user"
              />
              {errors.fullName && (
                <p className="text-red text-sm mt-1">{errors.fullName}</p>
              )}
            </div>
          )}

          <div className="mb-4">
            <InputBox
              name="email"
              type="email"
              id="email"
              placeholder="Email"
              icon="fi-rr-envelope"
            />
            {errors.email && (
              <p className="text-red text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div className="mb-4">
            <InputBox
              name="password"
              type="password"
              id="password"
              placeholder="Password"
              icon="fi-rr-lock"
            />
            {errors.password && (
              <p className="text-red text-sm mt-1">{errors.password}</p>
            )}
          </div>

          <button
            className={`btn-dark center mt-14 w-fit ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            type="submit"
            disabled={isLoading}
          >
            {isLoading
              ? "Loading..."
              : type === "sign-in"
              ? "Sign In"
              : "Sign Up"}
          </button>

          <div className="relative w-full flex items-center gap-2 my-10 opacity-10 uppercase text-black font-bold">
            <hr className="w-1/2 border-black" />
            <p className="text-sm">Or</p>
            <hr className="w-1/2 border-black" />
          </div>

          <button
            type="button"
            onClick={handleGoogleAuth}
            className="btn-dark flex items-center justify-center w-[90%] center gap-4"
          >
            <img src={googleIcon} alt="google" className="w-5" />
            <p>Continue with Google</p>
          </button>

          {type === "sign-in" ? (
            <p className="mt-6 text-dark-grey text-xl text-center">
              Don't have an account?{" "}
              <Link to="/signup" className="underline text-black text-xl ml-1">
                Join us today
              </Link>
            </p>
          ) : (
            <p className="mt-6 text-dark-grey text-xl text-center">
              Already a member?{" "}
              <Link to="/signin" className="underline text-black text-xl ml-1">
                Sign in here
              </Link>
            </p>
          )}
        </form>
      </section>
    </AnimationWrapper>
  );
};

export default UserAuthForm;
