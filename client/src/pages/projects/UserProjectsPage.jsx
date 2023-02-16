import React from 'react';
import { Container } from "@mui/system";
import ProjectList from '../../components/projects/ProjectList';

function UserProjectsPage(props) {
    return (
        <Container>
            <ProjectList/>
        </Container>
    );
}

export default UserProjectsPage;