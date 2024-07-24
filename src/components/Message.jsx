// Message.jsx

import styled from 'styled-components';

const MessageItem = styled.div`
  padding: 0.5rem;
  border-bottom: 1px solid #ccc;
`;

const FileLink = styled.a`
  display: block;
  color: #007bff;
  text-decoration: none;
  margin-top: 0.5rem;
  &:hover {
    text-decoration: underline;
  }
`;

const Message = ({ sender, text, fileUrl }) => (
  <MessageItem>
    <strong>{sender}:</strong>
    {text && <div>{text}</div>}
    {fileUrl && (
      <FileLink href={fileUrl} target="_blank" rel="noopener noreferrer">
        View File
      </FileLink>
    )}
  </MessageItem>
);

export default Message;
