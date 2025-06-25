import { useState } from "react";

const InputBox = ({ name, type, id, value, placeholder, icon }) => {
  const [passwordVisibility, setPasswordVisibility] = useState(false);
  return (
    <div className="relative w-[100%] mb-4">
      <input
        type={type === "password" && passwordVisibility ? "text" : type}
        id={id}
        name={name}
        defaultValue={value}
        placeholder={placeholder}
        className="input-box"
      />
      <i className={`fi ${icon} input-icon`}></i>

      {type === "password" && (
        <i
          className={`fi input-icon left-auto right-4 cursor-pointer ${
            passwordVisibility ? "fi-rr-eye-crossed" : "fi-rr-eye"
          }`}
          onClick={() => setPasswordVisibility(!passwordVisibility)}
        ></i>
      )}
    </div>
  );
};

export default InputBox;
