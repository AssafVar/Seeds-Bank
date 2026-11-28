import React from "react";
import { act, fireEvent, screen } from "@testing-library/react";
import { renderWithProviders, buildAuthValue } from "../../test-utils/renderWithProviders";
import RegisterForm from "./RegisterForm";

// extractErrorMessage itself is covered in serverCalls.test.js.
jest.mock("../../services/serverCalls", () => ({
  extractErrorMessage: (err) => err.response.data.message || err.response.data,
}));

const tooMany = { response: { status: 429, data: { message: "Too many attempts, try again in a minute." } } };

function setup(onLogin) {
  renderWithProviders(<RegisterForm isSignup={false} setIsSignup={jest.fn()} handleLogin={jest.fn()} />, {
    authValue: buildAuthValue({ onLogin }),
  });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.com" } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret1" } });
}

const submit = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
  });
};

describe("RegisterForm error display", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("keeps the too-many-attempts message until the next submit", async () => {
    const onLogin = jest.fn().mockRejectedValueOnce(tooMany).mockResolvedValue({});
    setup(onLogin);

    await submit();
    expect(screen.getByText("Too many attempts, try again in a minute.")).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(30000));
    expect(screen.getByText("Too many attempts, try again in a minute.")).toBeInTheDocument();

    await submit();
    expect(screen.queryByText("Too many attempts, try again in a minute.")).not.toBeInTheDocument();
  });

  it("still clears other errors after 2 seconds", async () => {
    const onLogin = jest.fn().mockRejectedValue({ response: { status: 401, data: "Wrong username or password!" } });
    setup(onLogin);

    await submit();
    expect(screen.getByText("Wrong username or password!")).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(2100));
    expect(screen.queryByText("Wrong username or password!")).not.toBeInTheDocument();
  });
});
