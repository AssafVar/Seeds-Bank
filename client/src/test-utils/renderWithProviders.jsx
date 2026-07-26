import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import authContext from "../contexts/AuthContext";
import theme from "../theme";

export const buildAuthValue = (overrides = {}) => ({
  activeUser: null,
  onLogin: jest.fn(),
  onLogout: jest.fn(),
  updateActiveUser: jest.fn(),
  ...overrides,
});

// Colocated-test entry point: wraps a component with the same providers it
// gets in the real app (router, MUI theme, auth context) so page/component
// tests don't each have to re-wire this boilerplate. Pass `routePath` (e.g.
// "/projects/:projectId") for a component that reads useParams() - without
// it, `ui` is rendered directly under the router with no route matching,
// which is enough for components that only use useNavigate/useSearchParams.
export function renderWithProviders(
  ui,
  { authValue = buildAuthValue(), route = "/", routePath, ...renderOptions } = {}
) {
  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <ThemeProvider theme={theme}>
          <authContext.Provider value={authValue}>
            {routePath ? <Routes><Route path={routePath} element={children} /></Routes> : children}
          </authContext.Provider>
        </ThemeProvider>
      </MemoryRouter>
    );
  }
  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
