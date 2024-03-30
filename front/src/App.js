import './App.css';
import { useState, useMemo, useEffect } from 'react';

import {
  fetchFiles,
  fetchBlocks,
  fetchTransfers,
  putTransfer,
  fetchProgressFraction,
	fetchSearch,
} from './network';

import { LeftyTextInput } from './LeftyTextInput';

function App() {
  const [progressFraction, setProgressFraction] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [files, setFiles] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loadedFiles, setLoadedFiles] = useState([]);

  const [currentBlock, setCurrentBlock] = useState();
  
  const [currentFile, setCurrentFile] = useState();
  const currentBlocks = useMemo(()=> (
    blocks.filter(block=> block.file === currentFile.filename)
  ), [blocks, currentFile]);

  const [currentTransfer, setCurrentTransfer] = useState(null);

  useEffect(()=> {
    fetchProgressFraction().then(setProgressFraction);
  }, []);
  
  useEffect(()=> {
    void (
      setCurrentTransfer(
        !currentBlock ? null :
        transfers.find(({ file, label })=> (
          file === currentBlock.file
          &&
          label === currentBlock.label
        )) ?? ({
          file: currentBlock.file,
          label: currentBlock.label,
          src: currentBlock.cmds.map(cmd=> (cmd.cmd[1] || '')),
          to: currentBlock.cmds.map(cmd=> ''),
        })
      )
    )
  }, [transfers, currentBlock]);
  
  const loadFiles = useMemo(()=> ()=> {
    fetchFiles().then(setFiles);
  }, []);

  const loadTransfers = useMemo(()=> ()=> {
    fetchTransfers().then(setTransfers);
  }, []);

  const searchBlocks = useMemo(()=> (searchString)=> {
    fetchSearch({ searchString }).then(setSearchResults);
  }, []);
	
  const saveTransfer = useMemo(()=> ()=> {
    setIsSaving(true);
    putTransfer(currentTransfer)
      .then(res => {
        setTransfers(old => [...old.filter(({file, label})=>
          (file !== currentTransfer.file || label !== currentTransfer.label))
          , {...currentTransfer}]);
      }).finally(()=> setIsSaving(false))
  }, [currentTransfer]);

  useEffect(()=> void loadFiles(), []);
  useEffect(()=> void loadTransfers(), []);

  const selectFileAndLabel = useMemo(()=> (file, label)=> {
    setCurrentBlock(null);
    
    if(loadedFiles.find(f=> f.filename === file.filename)){
      setCurrentFile(file);
      setCurrentBlock(blocks.find(block=> block.label === label));
    } else {
      fetchBlocks({ file: file.filename }).then(nuBlocks => {
        setBlocks(oldBlocks => [
          ...oldBlocks.filter(block => block.file !== file.filename),
          ...nuBlocks,
        ]);
        
        setCurrentBlock(nuBlocks.find(block=> block.label === label));
        setCurrentFile(file);
        setLoadedFiles(old=> [
          ...old.filter(f=> f.filename !== file.filename),
          file,
        ]);
      });
    }
  }, [loadedFiles]);

  // search by text content (api query)
  
  return (
    <div className="App">
      <div className='top-nav'>
        <h1>תירגום לגירסה אדומה</h1>
        <input className='search-input' placeholder='search...' onChange={e=> e.target.value ? searchBlocks(e.target.value) : setSearchResults([])}/>
      </div>
      <div className='main'>
        <div className='left-menu'>
          <h2>Files - {(progressFraction*100).toFixed(2)}% Translated</h2>
          <ul className='files-list'>
            {
              files.map((file)=>(
                <li
                  style={{
                    fontWeight: Math.min(9, 2+Math.round(
                      12*(file.progress?.completed || 0)/
                      (file.progress?.blocks || 1)
                    ))+'00'
                  }}
                  key={file.filename}
                  className={file.filename === currentFile?.filename ? 'active' : ''}
                  onClick={()=> !isSaving && selectFileAndLabel(file)}>
                  {file.filename.substr(11)}
                  {' - '}
                  {(file.progress?.completed || 0)}/
                  { (file.progress?.blocks || 1)}
                </li>
              ))
            }
          </ul>
        </div>
        
        {!currentFile ? null : (
          <ul className='labels-list'>
            {
              currentBlocks.map(block=> (
                <li
                  style={{
                    fontWeight: block.hasTranslation ? 'bold' : '100'
                  }}
                  key={block.label}
                  className={block.label === currentBlock?.label ? 'active' : ''}
                  onClick={()=> !isSaving && setCurrentBlock(block)}>
                  {block.label}
                </li>
              ))
            }
          </ul>
        )}
      
        <ul>
          {
            !currentBlock ? null : (
              currentBlock.cmds.map((cmd, i)=> (
                <li key={i} style={{
                  display: (!cmd.cmd[1] || cmd.cmd[1] === '@') ? 'none':'block'
                }}>
                  <span>
                    {cmd.cmd[1]}
                  </span>
                  
                  {
                    !currentTransfer ? <div/> : (
                      <LeftyTextInput
                        value={currentTransfer.to[i]}
                        onChange={nu=> setCurrentTransfer(ct => ({
                          ...ct,
                          to: [
                            ...ct.to.slice(0,i),
                            nu,
                            ...ct.to.slice(i+1),
                          ],
                        }))}
                      />
                    )}

                </li>
              ))
            )
          }
          <hr/>
          {
            !currentTransfer? null : (
              <li key='save'>
                <button disabled={isSaving} onClick={saveTransfer}>
                  Save
                </button>
              </li>
            )
          }

        </ul>
        <div className="search-menu">
          <ul>
            {
              (searchResults.map((result, i)=> (
                <li key={i} onClick={()=> selectFileAndLabel(files.find(f => f.filename === result.file), result.label)}>
                  <div>
                    <p>file: {result.file.substr(11)}</p>
                    <p>label: {result.label}</p>
                  </div>
                  <div>
                    <ul>
                      {result.cmds.map((cmd, i)=> (
                        <li key={i}>{cmd.cmd[1]}</li>
                       ))}
                    </ul>
                  </div>
                </li>
              )))
            }
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
