import React, { useEffect, useMemo, useState } from 'react';
import './Panel.css';
import Request = chrome.devtools.network.Request;
import { Drawer, Table, Tooltip } from 'antd';
import { ColumnType } from 'antd/es/table';
import { Input } from 'antd';
import ReactJson from 'react-json-view';

const columns: ColumnType<Request>[] = [
  {
    title: 'path',
    render: (value, record, index) => {
      const url = new URL(record.request.url);
      const data = `${url.origin}${url.pathname}`;
      return (
        <span className="ellipsis-item">
          <Tooltip title={data}>{data}</Tooltip>
        </span>
      );
    },
    width: 240,
  },
  {
    title: 'method',
    render: (value, record, index) => {
      return record.request.method;
    },
    width: 120,
  },
  {
    title: 'requestBody',
    render: (value, record, index) => {
      const { postData } = record.request;
      if (!postData || !postData.text) {
        return '-';
      }
      const { mimeType, text } = postData;
      const data =
        mimeType === 'application/json'
          ? JSON.stringify(JSON.parse(text), null, 2)
          : text;
      return record.request.method === 'POST' ? (
        <span className="ellipsis-item">
          <Tooltip
            placement={'top'}
            title={
              <pre
                style={{
                  maxHeight: 300,
                  overflow: 'auto',
                }}
              >
                {data}
              </pre>
            }
          >
            {data}
          </Tooltip>
        </span>
      ) : null;
    },
    width: 240,
  },
  {
    title: 'query',
    render: (value, record, index) => {
      return (
        <span className="ellipsis-item">
          <Tooltip
            placement={'top'}
            title={
              <pre
                style={{
                  maxHeight: 300,
                  overflow: 'auto',
                }}
              >
                {JSON.stringify(record.request.queryString, null, 2)}
              </pre>
            }
          >
            {JSON.stringify(record.request.queryString)}
          </Tooltip>
        </span>
      );
    },
    width: 240,
  },
  {
    title: 'responseBody',
    render: (value, record, index) => {
      const { content } = record.response;
      if (!content || !content.text) {
        return '-';
      }

      const { mimeType, text } = content;
      const data =
        mimeType === 'application/json'
          ? JSON.stringify(JSON.parse(text), null, 2)
          : text;
      return record.request.method === 'POST' ? (
        <span className="ellipsis-item">
          <Tooltip
            placement={'top'}
            title={
              <pre
                style={{
                  maxHeight: 300,
                  overflow: 'auto',
                }}
              >
                {data}
              </pre>
            }
          >
            {data}
          </Tooltip>
        </span>
      ) : null;
    },
    width: 240,
  },
];

const parseData = (req: Request) => {
  let requestData = null;
  let responseData = null;
  const { postData } = req.request;
  const { content } = req.response;
  if (!postData?.text || !postData?.mimeType) {
  } else if (postData.mimeType.includes('application/json')) {
    requestData = JSON.parse(postData.text);
    if (Array.isArray(requestData)) {
      requestData.forEach((item) => {
        if (Array.isArray(item.events)) {
          item.events.forEach((it: any) => {
            if (it.params) {
              try {
                it.params = JSON.parse(it.params);
              } catch (e) {}
            }
          });
        }
      });
    }
  } else {
    responseData = postData.text;
  }

  if (!content?.text || !content?.mimeType) {
  } else if (content.mimeType.includes('application/json')) {
    responseData = JSON.parse(content.text);
  } else {
    responseData = content.text;
  }

  return {
    requestData,
    requestMimeType: postData?.mimeType,
    responseData,
    responseMiMeType: content?.mimeType,
    _origin: req,
  };
};
const Panel: React.FC = () => {
  const [dataSource, setDataSource] = React.useState<Request[]>([]);
  const [keywords, setKeywords] = React.useState<string>('');
  const ref = React.useRef<any[]>([]);
  const [scroll, setScroll] = useState({
    x: 300,
    y: 300,
  });
  const [visible, setVisible] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<any>({});
  useEffect(() => {
    setScroll({
      x: window.innerWidth - 16,
      y: window.innerHeight - 96,
    });
    let index = 0;
    const handler = (request: Request) => {
      ref.current.unshift({
        ...request,
        index,
        parsedData: parseData(request),
      });
      setDataSource([...ref.current]);
    };
    chrome.devtools.network.onRequestFinished.addListener(handler);
    return () => {
      chrome.devtools.network.onRequestFinished.removeListener(handler);
    };
  }, []);
  const filterDataSource = useMemo(() => {
    return dataSource.filter((item) => {
      if (item.request.url.includes(keywords)) {
        return true;
      }
      if (item.request.postData?.text?.includes(keywords)) {
        return true;
      }

      if (item.response.content.text?.includes(keywords)) {
        return true;
      }
    });
  }, [keywords, dataSource]);
  return (
    <div className="container">
      <Input
        onChange={(e) => setKeywords(e.target.value)}
        style={{
          marginBottom: 8,
        }}
      />
      <Table
        virtual
        scroll={scroll}
        pagination={false}
        rowKey={'index'}
        columns={columns}
        dataSource={filterDataSource}
        size={'small'}
        onRow={(record) => {
          return {
            onClick: () => {
              setSelectedRow(record);
              console.log(record);
              setVisible(true);
            },
          };
        }}
      />
      <Drawer
        width={'75%'}
        open={visible}
        onClose={() => {
          setVisible(false);
        }}
      >
        <ReactJson src={selectedRow.parsedData} />
      </Drawer>
    </div>
  );
};

export default Panel;
