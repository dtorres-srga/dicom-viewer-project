import axios from 'axios';
import { unzip, unzipSync } from 'fflate';
import React, { createRef, useState } from 'react';
import { Button, Card, Form, ProgressBar } from 'react-bootstrap';
import { BoxArrowUp } from 'react-bootstrap-icons';
import Dropzone from 'react-dropzone';
import './FileUpload.css';

const FileUpload = ({ setFiles }) => {
  const [localFiles, setLocalFiles] = useState([]);              // The local files to be uploaded
  const [uploadFiles, setUploadFiles] = useState(new Map());     // The upload files map with the keys being the file name and the value being the upload progress
  const [uploadedFiles, setUploadedFiles] = useState(new Map()); // The uploaded files map with the keys being the file name and the value being the URL
  const [error, setError] = useState("");                        // An error which will be displayed if not empty
  const [hover, setHover] = useState(false);                     // Whether files are being hovered over the drag and drop

  const dropzoneRef = createRef();

  const hasSelectedFiles = () => {
    return localFiles.length
  }

  const isUploadingFiles = () => {
    return uploadFiles.size
  }

  const getFileSelectRows = () => {
    return [...localFiles].map((file, index) => {
      return (
        <tr key={index} style={{ paddingBottom: '10px' }}>
          <td>
            {file.name}
          </td>
        </tr>
      )
    })
  }

  const getFileUploadRows = () => {
    return [...uploadFiles.entries()].map(([name, progress], index) => {
      return (
        <tr key={index} style={{ paddingBottom: '10px' }}>
          <td>
            {name}
            {progress >= 0 ?
              <ProgressBar variant={progress >= 100 ? 'success' : 'primary'} now={progress} label={`${progress}%`} />
              :
              <ProgressBar variant='danger' now={Math.abs(progress)} label={"Error"} />
            }
          </td>
        </tr>
      )
    })
  }

  const getFileUploadProgress = () => {
    let total = 0;
    let upload = 0;

    uploadFiles.forEach((progress) => {
      upload += progress;
      total += 100;
    });

    let percentage = Math.round(upload / total * 100);

    return <ProgressBar variant={percentage >= 100 ? 'success' : 'primary'} now={percentage} label={`${percentage}%`} />
  }

  const getFileList = () => {
    let list
    if (isUploadingFiles()) {
      list = getFileUploadRows()
    } else if (hasSelectedFiles()) {
      list = getFileSelectRows()
    }

    return <table align='center'><tbody>{list}</tbody></table>
  }

  const getFilesFromZip = async (zipFile, multithreaded = true) => {
    const zipBuffer = new Uint8Array(await zipFile.arrayBuffer())
    const unzipped = multithreaded ?
      await new Promise((resolve, reject) => unzip(zipBuffer, (err, unzipped) => err ? reject(err)
        :
        resolve(unzipped)))
      : unzipSync(zipBuffer)

    return Object.keys(unzipped).filter(filename => unzipped[filename].length > 0).map(filename => new File([unzipped[filename]], filename))
  }

  const onSubmit = async event => {
    event.preventDefault()

    let files = []

    // Checking for ZIPs
    for (let file of localFiles) {
      if (file.type.includes("zip")) {
        files = files.concat((await getFilesFromZip(file)).filter(zippedFile => zippedFile.name.endsWith(".dcm") || zippedFile.name.endsWith(".dicom")))
      } else {
        files.push(file)
      }
    }

    // This just adds all the files to the upload files map and adds a progress of 0
    setUploadFiles(new Map(Array.from(files).map(file => [file.name, 0])))

    for (let file of files) {
      const formData = new FormData()
      formData.append('file', file)

      await axios.post(`${process.env.REACT_APP_API_CONNECTION_STRING}/upload`, formData, {
        onUploadProgress: progressEvent => {
          setUploadFiles(prev => new Map([...prev, [file.name, parseInt(Math.round((progressEvent.loaded * 100) / progressEvent.total))]]))
        }
      }).then(response => {
        uploadedFiles.set(response.data.fileName, { url: response.data.fileURL, data: response.data.dicomData })
      }).catch((error) => {
        setUploadFiles(prev => new Map([...prev, [file.name, prev.get(file.name) * -1]]))
        setError(error.message)
      })
    }

    setFiles(uploadedFiles)
  };

  return (
    <Form onSubmit={onSubmit}>
      <Card bg='dark' text='white' className='mb-2 upload-card'>
        <Card.Header className='h2'>Upload DICOMs</Card.Header>
        <Card.Body className='upload-card-body'>
          {!hasSelectedFiles() ? (
            <Dropzone
              accept={{
                'application/dcm': ['.dcm'],
                'application/dicom': ['.dicom'],
                'application/zip': ['.zip'],
                'application/x-zip-compressed': ['.zip'],
                'multipart/x-zip': ['.zip'],
              }}
              ref={dropzoneRef}
              className='upload-card-body-dropzone'
              multiple={true}
              onDrop={acceptedFiles => { setError(""); setLocalFiles(acceptedFiles); setHover(false) }}
              onDropRejected={() => { setError("Invalid file format, you must use DICOM files."); setHover(false) }}
              onDragEnter={() => setHover(true)}
              onDragLeave={() => setHover(false)}>
              {({ getRootProps, getInputProps }) => (
                <div className={'upload-card-body-dropzone' + (hover ? ' hover' : '')} {...getRootProps()}>
                  <input {...getInputProps()} />
                  <span className='upload-card-body-dropzone-icon'>
                    <BoxArrowUp size='5em' />
                  </span>
                  <Card.Subtitle className='mb-2 text-muted'>Drag and drop DICOM files to upload</Card.Subtitle>
                  {error && <Card.Subtitle className='text-danger'>{error}</Card.Subtitle>}
                </div>
              )}
            </Dropzone>
          ) : (
            <>
              {error && <Card.Subtitle className='text-danger'>{error}</Card.Subtitle>}
              {getFileList()}
            </>
          )}
        </Card.Body>
        <Card.Footer>
          {!isUploadingFiles() ? (
            !hasSelectedFiles() ?
              <Button variant='secondary' onClick={() => { if (dropzoneRef.current) dropzoneRef.current.open() }} autoFocus>Select Files</Button>
              :
              <Button className='btn-block' variant='primary' type='submit' autoFocus>Upload</Button>
          ) : (
            getFileUploadProgress()
          )}
        </Card.Footer>
      </Card>
    </Form>
  );
};

export default FileUpload;