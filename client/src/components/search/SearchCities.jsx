import { Autocomplete, TextField } from "@mui/material";
import React, { useEffect, useState } from "react";
import SearchIcon from '@mui/icons-material/Search';
import { fetchCities } from "../../services/serverCalls";

function SearchCities({props}) {

    const [options, setOptions] = useState([]);
    const [city, setCity] = useState('');
    const [isMounted, setIsMounted] = useState(false);

    const getCities = async() => {
        const cities = await fetchCities(city);
        setOptions(cities);
    };

    useEffect(() => {
        if (isMounted) {
          getCities()
        } else {
          setIsMounted(true);
        }
      }, [isMounted, city]);

  return (
    <Autocomplete
      options={options}
      getOptionLabel={(option) => option}
      renderInput={(params) => (
        <TextField
        onChange={(event)=>setCity(event.target.value)}
          variant="standard"
          style={{
            width: "500px",
            border: "1px solid #D8D4D3",
            borderRadius: "20px",
            textAlign: "left",
            padding: "10px",
          }}
          {...params}
          placeholder="Search..."
          InputProps={{
            disableUnderline: true,
            ...params.InputProps,
            startAdornment: (
              <>
                <SearchIcon />
                {params.InputProps.startAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

export default SearchCities;
