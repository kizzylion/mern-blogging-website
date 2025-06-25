import { Link } from "react-router-dom";
import InputBox from "../components/input.component";
import googleIcon from "../imgs/google.png";
import AnimationWrapper from "../common/page-animation";

const UserAuthForm = ({ type }) => {
  return (
    <AnimationWrapper keyValue={type}>
      <section className="h-cover flex items-center justify-center">
        <form action="" className="w-[80%] max-w-[400px]">
          <h1 className="text-4xl font-gelasio capitalize text-center mb-24">
            {type === "sign-in" ? "Welcome back" : "Join us today"}
          </h1>
          {type != "sign-in" ? (
            <InputBox
              name="fullName"
              type="text"
              id="fullName"
              placeholder="Full Name"
              icon="fi-rr-user"
            />
          ) : (
            ""
          )}
          <InputBox
            name="email"
            type="email"
            id="email"
            placeholder="Email"
            icon="fi-rr-envelope"
          />
          <InputBox
            name="password"
            type="password"
            id="password"
            placeholder="Password"
            icon="fi-rr-lock"
          />

          <button className="btn-dark center mt-14 w-fit" type="submit">
            {type === "sign-in" ? "Sign In" : "Sign Up"}
          </button>

          <div className="relative w-full flex items-center gap-2 my-10 opacity-10 uppercase text-black font-bold">
            <hr className="w-1/2 border-black" />
            <p className="text-sm">Or</p>
            <hr className="w-1/2 border-black" />
          </div>

          <button className="btn-dark flex items-center justify-center w-[90%] center gap-4">
            <img src={googleIcon} alt="google" className="w-5" />
            <p>Continue with Google</p>
          </button>

          {type == "sign-in" ? (
            <p className="mt-6 text-dark-grey text-xl text-center">
              Don't have an account ?{" "}
              <Link to="/signup" className="underline text-black text-xl ml-l">
                Join us today
              </Link>
            </p>
          ) : (
            <p className="mt-6 text-dark-grey text-xl text-center">
              Already a member ?{" "}
              <Link to="/signin" className="underline text-black text-xl ml-l">
                Sign in here.
              </Link>
            </p>
          )}
        </form>
      </section>
    </AnimationWrapper>
  );
};

export default UserAuthForm;
