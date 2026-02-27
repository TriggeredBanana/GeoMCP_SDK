import './App.css'
import { Sidebar, Menu, MenuItem, Submenu } from 'react-mui-sidebar';
import { Link } from 'react-router-dom';
import {Header} from './components/header'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSquarePollVertical } from '@fortawesome/free-solid-svg-icons';
import { faMessage } from '@fortawesome/free-regular-svg-icons';

function App() {
  return (
    <>
      <Header />
      <Sidebar width={"275px"} showProfile={false} themeColor="#26BE76" secondaryColor="#67CD99">
        <Menu subHeading="Meny">
          <MenuItem
            icon={<FontAwesomeIcon icon={faMessage} />}
            component={Link}
            link="/dashboard"
            badge={true}
            badgeContent="7"
            isSelected={true}
            >Chatbot</MenuItem>
            <MenuItem icon={<FontAwesomeIcon icon ={faSquarePollVertical} />}>Kartlag</MenuItem>
            <MenuItem icon={<FontAwesomeIcon icon ={faSquarePollVertical} />}>Analyse</MenuItem>
            <MenuItem icon={<FontAwesomeIcon icon ={faSquarePollVertical} />}>Eksporter</MenuItem>
        </Menu>
      </Sidebar>
    </>
  )
}

export default App